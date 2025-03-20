import { Actions, Manager, Notifications } from "@twilio/flex-ui";
const manager = Manager.getInstance();

const sendOutboundMessage = async (sendOutboundParams) => {
  const body = {
    ...sendOutboundParams,
    Token: manager.store.getState().flex.session.ssoTokenPayload.token,
  };
  if (body.ContentTemplateSid) {
    delete body.body;
  }

  const options = {
    method: "POST",
    body: new URLSearchParams(body),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
  };

  const { OpenChatFlag, To } = sendOutboundParams;

  try {
    const resp = await fetch(
      `${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/sendOutboundMessage`,
      options
    );
    const data = await resp.json();

    if (!OpenChatFlag && data.success) {
      Notifications.showNotification("outboundMessageSent", {
        message: To,
      });
    }

    if (!data.success) {
      Notifications.showNotification("outboundMessageFailed", {
        message: data.errorMessage,
      });
    }
  } catch (error) {
    console.error(error);
    Notifications.showNotification("outboundMessageFailed", {
      message: "Error calling sendOutboundMessage function",
    });
  }
};

// TODO - fallback and try and use outbound calling setup sids
// TODO - allow override of queue from action payload
Actions.registerAction("SendOutboundMessage", (payload) => {
  if (!payload.callerId)
    payload.callerId = process.env.FLEX_APP_TWILIO_FROM_NUMBER;

  if (payload.openChat) {
    // create a task immediately
    const sendOutboundParams = {
      OpenChatFlag: true,
      KnownAgentRoutingFlag: false,
      To: payload.destination,
      From: payload.callerId,
      Body: payload.body,
      ContentTemplateSid: payload.contentTemplateSid,
      WorkerSid: manager.workerClient.sid,
      WorkerFriendlyName: manager.user.identity,
      WorkspaceSid: process.env.FLEX_APP_WORKSPACE_SID,
      WorkflowSid: process.env.FLEX_APP_WORKFLOW_SID,
      QueueSid: process.env.FLEX_APP_QUEUE_SID,
      InboundStudioFlow: process.env.FLEX_APP_INBOUND_STUDIO_FLOW,
    };
    sendOutboundMessage(sendOutboundParams);
  } else {
    // send message and inbound triggers studio flow. optional known agent routing
    const sendOutboundParams = {
      OpenChatFlag: false,
      KnownAgentRoutingFlag: !!payload.routeToMe,
      To: payload.destination,
      From: payload.callerId,
      Body: payload.body,
      ContentTemplateSid: payload.contentTemplateSid,
      WorkerSid: manager.workerClient.sid,
      WorkerFriendlyName: manager.user.identity,
      WorkspaceSid: process.env.FLEX_APP_WORKSPACE_SID, // we need this to lookup task if there is a active conversation already
      WorkflowSid: "",
      QueueSid: "",
      InboundStudioFlow: process.env.FLEX_APP_INBOUND_STUDIO_FLOW,
    };
    sendOutboundMessage(sendOutboundParams);
  }
});
