// Create a flex interaction that targets the agent with a task and add in a message to the conversation
exports.createOutboundFlexConversation = async (
  client,
  customerConversation,
  To,
  From,
  Body,
  WorkerFriendlyName,
  routingProperties
) => {
  const channelType = To.startsWith("whatsapp") ? "whatsapp" : "sms";
  console.log(To, From, Body, WorkerFriendlyName, routingProperties);

  // Note that we are passing in an existing conversation sid.
  // In some use cases for outbound agent initiated conversations (and in many of the Twilio docs)
  // instead of passing in the conversation sid then the customer/twilio number participant is passed
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

  console.log(interaction);
  const taskAttributes = JSON.parse(interaction.routing.properties.attributes);
  console.log(taskAttributes);

  const message = await client.conversations.v1
    .conversations(taskAttributes.conversationSid)
    .messages.create({ author: WorkerFriendlyName, body: Body });

  console.log(message);

  return {
    success: true,
    interactionSid: interaction.sid,
    conversationSid: taskAttributes.conversationSid,
  };
};
