const TokenValidator = require("twilio-flex-token-validator").functionValidator;
const { createOutboundCustomerConversation } = require(Runtime.getFunctions()[
  "api-helpers/conversations_helper"
].path);

const { sendOutboundMessageAndWaitForReply } = require(Runtime.getFunctions()[
  "outbound-helpers/sendOutboundMessageAndWaitForReply"
].path);

const { createOutboundFlexConversation } = require(Runtime.getFunctions()[
  "outbound-helpers/createOutboundFlexConversation"
].path);

const directionText = (taskDirection) => {
  if (!taskDirection) return "";
  switch (taskDirection.toLowerCase()) {
    case "inbound":
      return "Inbound";
    case "outbound":
      return "Outbound";
    default:
      return "";
  }
};

const existingOpenConversationResponse = (
  callback,
  response,
  existingConversationDetails,
  to
) => {
  const direction = directionText(existingConversationDetails.taskDirection);
  const agentName = existingConversationDetails.agentName
    ? ` with ${existingConversationDetails.agentName}`
    : "";

  response.appendHeader("Content-Type", "application/json");
  response.setBody({
    success: false,
    errorMessage: `Error sending message. There is an open ${direction} conversation already to ${to} ${agentName}`,
  });
  return callback(null, response);
};

exports.handler = TokenValidator(async function (context, event, callback) {
  const {
    To,
    From,
    ContentTemplateSid,
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
    let customerConversation = undefined;
    let reusingExistingConversation = false;

    // either create a new conversation or if there is already an active conversation in progress
    // then get its details and depending on outbound scenario we may be able to re-use it
    const { newConversation, existingConversationDetails } =
      await createOutboundCustomerConversation(client, WorkspaceSid, To, From);

    // Handle existing conversation in progress
    if (existingConversationDetails) {
      if (!existingConversationDetails.taskExists) {
        // For the scenario where:
        // "We are waiting until the customer replies before creating a task &&
        // there is an existing conversation &&
        // existing conversation is waiting for customer to reply before creating a task"
        //
        // Then we are OK to re-use the existing channel and add messages to it
        console.log(
          "There was already an active conversation waiting for customer to reply - reuse it",
          existingConversationDetails.conversation.sid
        );

        customerConversation = existingConversationDetails.conversation;
        reusingExistingConversation = true;
      } else {
        return existingOpenConversationResponse(
          callback,
          response,
          existingConversationDetails,
          To
        );
      }
    } else {
      customerConversation = newConversation;
    }

    // We have a conversation resource to use. Check if we are a send and wait for reply sceanrio
    // or if we need to use Interactins API to creaet a task.

    let responseBody = {};

    if (!OpenChatFlag) {
      responseBody = await sendOutboundMessageAndWaitForReply(
        client,
        customerConversation,
        Body,
        ContentTemplateSid,
        KnownAgentRoutingFlag,
        WorkerFriendlyName,
        WorkerSid,
        InboundStudioFlow,
        reusingExistingConversation
      );
    } else {
      responseBody = await createOutboundFlexConversation(
        client,
        customerConversation,
        To,
        From,
        Body,
        ContentTemplateSid,
        WorkerFriendlyName,
        {
          workspace_sid: WorkspaceSid,
          workflow_sid: WorkflowSid,
          queue_sid: QueueSid,
          worker_sid: WorkerSid,
        }
      );
    }

    response.appendHeader("Content-Type", "application/json");
    response.setBody(responseBody);
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
