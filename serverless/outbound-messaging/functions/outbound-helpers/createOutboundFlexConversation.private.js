// Create a flex interaction that targets the agent with a task and add in a message to the conversation
exports.createOutboundFlexConversation = async (
  client,
  customerConversation,
  To,
  From,
  Body,
  ContentTemplateSid,
  WorkerFriendlyName,
  routingProperties
) => {
  const channelType = To.startsWith("whatsapp") ? "whatsapp" : "sms";
  // Note that we are passing in an existing conversation sid.
  // In some use cases for outbound agent initiated conversations (and in many of the Twilio docs)
  // instead of passing in the conversation sid then the customer/Twilio number participant is passed
  // and the interactions endpoint would create a new conversation for us.
  // We don't do this for this use case as we had created the conversation in advance to catch the scenario
  // of an existing active conversation.
  const interaction = await client.flexApi.v1.interaction.create({
    channel: {
      type: channelType,
      initiated_by: "agent",
      properties: { media_channel_sid: customerConversation.sid },
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

  const taskAttributes = JSON.parse(interaction.routing.properties.attributes);

  // Prepare message options
  let messageOptions = {
    author: WorkerFriendlyName,
  };

  if (channelType === 'whatsapp' && ContentTemplateSid) {
    messageOptions.contentSid = ContentTemplateSid;
  } else {
    messageOptions.body = Body;
  }

  // Send the initial message
  const message = await client.conversations.v1
    .conversations(taskAttributes.conversationSid)
    .messages.create(messageOptions);

  return {
    success: true,
    interactionSid: interaction.sid,
    conversationSid: taskAttributes.conversationSid,
  };
};