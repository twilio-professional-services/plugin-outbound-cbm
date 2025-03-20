const {
  setKnownAgentRoutingOnConversationAttributes,
  setStudioWebhookOnConversation,
  addAgentMessageToConversation,
} = require(Runtime.getFunctions()["api-helpers/conversations_helper"].path);

// No Interactions API required for this scenario. We add a message to a Conversation so it is sent to the customer
// and then setup the Conversation with a webhook to handle replies from the customer.

// We use the conversation attributes to optionally track if the reply needs to go to a specific agent

// When the customer replies a Studio flow would handle the reply and use SendToFlex to route
// to an agent and optionally use the conversation attributes to set the task attributes to target a specific agent
exports.sendOutboundMessageAndWaitForReply = async (
  client,
  conversation,
  Body,
  ContentTemplateSid,
  KnownAgentRoutingFlag,
  WorkerFriendlyName,
  WorkerSid,
  InboundStudioFlow,
  reusingExistingConversation
) => {
  // Set flag in channel attribtues so Studio knows if it should set task attribute to target known agent
  if (KnownAgentRoutingFlag)
    await setKnownAgentRoutingOnConversationAttributes(
      client,
      conversation,
      WorkerSid
    );

  // Point a webhook at studio to handle replies from customer
  if (!reusingExistingConversation) {
    await setStudioWebhookOnConversation(
      client,
      conversation,
      InboundStudioFlow
    );
  }

  // Add agents initial message
  await addAgentMessageToConversation(
    client,
    conversation,
    WorkerFriendlyName,
    Body,
    ContentTemplateSid
  );

  return { success: true, conversationSid: conversation.sid };
};
