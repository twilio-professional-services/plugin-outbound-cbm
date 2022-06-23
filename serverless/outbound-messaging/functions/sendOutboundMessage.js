const TokenValidator = require("twilio-flex-token-validator").functionValidator;

// Create a flex interaction that targets the agent with a task and add in a message to the conversation
const openAChatTask = async (
  client,
  To,
  From,
  Body,
  WorkerFriendlyName,
  routingProperties
) => {
  const channelType = To.startsWith("whatsapp") ? "whatsapp" : "sms";
  console.log(To, From, Body, WorkerFriendlyName, routingProperties);
  const interaction = await client.flexApi.v1.interaction.create({
    channel: {
      type: channelType,
      initiated_by: "agent",
      participants: [
        {
          address: To,
          proxy_address: From,
        },
      ],
    },
    routing: {
      properties: {
        ...routingProperties,
        task_channel_unique_name: "chat",
        attributes: {
          from: To,
          direction: "outbound",
          customerName: "Customer",
          customerAddress: To,
          twilioNumber: From,
          channelType: channelType,
        },
      },
    },
  });

  console.log(interaction);
  const taskAttributes = JSON.parse(interaction.routing.properties.attributes);
  console.log(taskAttributes);

  const message = await client.conversations
    .conversations(taskAttributes.conversationSid)
    .messages.create({ author: WorkerFriendlyName, body: Body });

  console.log(message);

  return {
    success: true,
    interactionSid: interaction.sid,
    conversationSid: taskAttributes.conversationSid,
  };
};

const sendOutboundMessage = async (
  client,
  To,
  From,
  Body,
  KnownAgentRoutingFlag,
  WorkerFriendlyName,
  InboundStudioFlow
) => {
  const friendlyName = `Outbound $(From) -> $(To)`;
  console.log(friendlyName);

  // Set flag in channel attribtues so Studio knows if it should set task attribute to target known agent
  let converstationAttributes = { KnownAgentRoutingFlag };
  if (KnownAgentRoutingFlag)
    converstationAttributes.KnownAgentWorkerFriendlyName = WorkerFriendlyName;
  const attributes = JSON.stringify(converstationAttributes);

  // Create Channel
  const channel = await client.conversations.conversations.create({
    friendlyName,
    attributes,
  });

  console.log(channel);
  try {
    // Add customer to channel
    const participant = await client.conversations
      .conversations(channel.sid)
      .participants.create({
        "messagingBinding.address": To,
        "messagingBinding.proxyAddress": From,
      });

    console.log(participant);
  } catch (error) {
    console.log(error);

    if (error.code === 50416)
      return {
        success: false,
        errorMessage: `Error sending message. There is an open conversation already to ${To}`,
      };
    else
      return {
        success: false,
        errorMessage: `Error sending message. Error occured adding ${To} channel`,
      };
  }

  // Point the channel to Studio
  const webhook = client.conversations
    .conversations(channel.sid)
    .webhooks.create({
      target: "studio",
      configuration: { flowSid: InboundStudioFlow },
    });

  console.log(webhook);

  // Add agents initial message
  const message = await client.conversations
    .conversations(channel.sid)
    .messages.create({ author: WorkerFriendlyName, body: Body });

  console.log(message);

  return { success: true, channelSid: channel.sid };
};

exports.handler = TokenValidator(async function (context, event, callback) {
  const {
    To,
    From,
    Body,
    WorkspaceSid,
    WorkflowSid,
    QueueSid,
    WorkerSid,
    WorkerFriendlyName,
    InboundStudioFlow,
  } = event;

  let { OpenChatFlag, KnownAgentRoutingFlag } = event;
  OpenChatFlag = OpenChatFlag === "true" ? true : false;
  KnownAgentRoutingFlag = KnownAgentRoutingFlag === "true" ? true : false;

  const client = context.getTwilioClient();

  // Create a custom Twilio Response
  // Set the CORS headers to allow Flex to make an HTTP request to the Twilio Function
  const response = new Twilio.Response();
  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST GET");
  response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    let sendResponse = null;

    if (OpenChatFlag) {
      // create task and add the message to a channel
      sendResponse = await openAChatTask(
        client,
        To,
        From,
        Body,
        WorkerFriendlyName,
        {
          workspace_sid: WorkspaceSid,
          workflow_sid: WorkflowSid,
          queue_sid: QueueSid,
          worker_sid: WorkerSid,
        }
      );
    } else {
      // create a channel but wait until customer replies before creating a task
      sendResponse = await sendOutboundMessage(
        client,
        To,
        From,
        Body,
        KnownAgentRoutingFlag,
        WorkerFriendlyName,
        InboundStudioFlow
      );
    }

    response.appendHeader("Content-Type", "application/json");
    response.setBody(sendResponse);
    // Return a success response using the callback function.
    callback(null, response);
  } catch (err) {
    response.appendHeader("Content-Type", "plain/text");
    response.setBody(err.message);
    response.setStatusCode(500);
    // If there's an error, send an error response
    // Keep using the response object for CORS purposes
    console.error(err);
    callback(null, response);
  }
});
