const {
  taskDetailsFromConversationSid,
  agentNameFromIdentity,
} = require(Runtime.getFunctions()["api-helpers/taskrouter_helper"].path);

const parseConversationSid = (str) => {
  const regex = /\bCH[a-zA-Z0-9]{32}\b/;
  const matches = str.match(regex);

  return matches.length ? matches[0] : undefined;
};

const agentIdentityFromConversation = async (client, conversationSid) => {
  const participants = await client.conversations.v1
    .conversations(conversationSid)
    .participants.list();

  // return the first participant that is an sdk identity rather than messagingBinding.
  // This participant should be the agent
  for (const participant of participants) {
    if (participant.identity) {
      return decodeURIComponent(participant.identity.replace("_", "%")); // flex encodes non alpha with _ rather than %
    }
  }
};

exports.createOutboundCustomerConversation = async (
  client,
  workspaceSid,
  to,
  from
) => {
  const conversation = await client.conversations.v1.conversations.create();
  console.log("Created conversation", conversation.sid);

  // 'to' is the customer number
  // 'from' is the Twilio number
  try {
    const participant = await client.conversations.v1
      .conversations(conversation.sid)
      .participants.create({
        "messagingBinding.address": to,
        "messagingBinding.proxyAddress": from,
      });

    return { newConversation: conversation };
  } catch (error) {
    if (error.code === 50416) {
      // There is already an active conversation with the customer from the twilio number
      // Lets figure out direction and participants so we can return useful warning
      const existingConversationSid = parseConversationSid(error.message);

      // delete the conversation that we created but couldn't use as participant add failed
      await client.conversations.v1.conversations(conversation.sid).remove();
      console.log("Deleted conversation", conversation.sid);

      if (!existingConversationSid) return {};

      const existingConversation = await client.conversations.v1
        .conversations(existingConversationSid)
        .fetch();

      console.log(
        "Active conversation for this messagingBinding participant",
        existingConversation
      );

      const agentIdentity = await agentIdentityFromConversation(
        client,
        existingConversationSid
      );

      const agentName = await agentNameFromIdentity(
        client,
        workspaceSid,
        agentIdentity
      );

      const { taskExists, taskDirection } =
        (await taskDetailsFromConversationSid(
          client,
          workspaceSid,
          existingConversationSid
        )) || {};

      return {
        existingConversationDetails: {
          conversation: existingConversation,
          taskDirection,
          taskExists,
          agentName,
        },
      };
    } else {
      throw error;
    }
  }
};

exports.setKnownAgentRoutingOnConversationAttributes = async (
  client,
  conversation,
  WorkerSid
) => {
  const conversationAttributes = {
    KnownAgentRoutingFlag: true,
    KnownAgentWorkerSid: WorkerSid,
  };

  await client.conversations.v1
    .conversations(conversation.sid)
    .update({ attributes: JSON.stringify(conversationAttributes) });
};

exports.setStudioWebhookOnConversation = async (
  client,
  conversation,
  InboundStudioFlow
) => {
  await client.conversations.v1
    .conversations(conversation.sid)
    .webhooks.create({
      target: "studio",
      "configuration.flowSid": `${InboundStudioFlow}`,
    });
};

exports.addAgentMessageToConversation = async (
  client,
  conversation,
  WorkerFriendlyName,
  Body,
  ContentTemplateSid
) => {
  const messageOptions = {
    author: WorkerFriendlyName,
  };

  if (ContentTemplateSid) {
    messageOptions.contentSid = ContentTemplateSid;
  } else {
    messageOptions.body = Body;
  }

  const message = await client.conversations.v1
    .conversations(conversation.sid)
    .messages.create(messageOptions);
};
