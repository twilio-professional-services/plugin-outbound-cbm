exports.taskDetailsFromConversationSid = async (
  client,
  workspaceSid,
  conversationSid
) => {
  const tasks = await client.taskrouter.v1.workspaces(workspaceSid).tasks.list({
    evaluateTaskAttributes: `conversationSid == "${conversationSid}"`,
  });

  if (!tasks || !tasks.length) return undefined;

  const task = tasks[0];

  return {
    taskExists: true,
    taskDirection: JSON.parse(task.attributes)?.direction,
  };
};

exports.agentNameFromIdentity = async (client, workspaceSid, agentIdentity) => {
  if (!agentIdentity) return undefined;

  const workers = await client.taskrouter.v1
    .workspaces(workspaceSid)
    .workers.list({ friendlyName: agentIdentity });

  if (!workers || !workers.length) return undefined;

  const worker = workers[0];
  return JSON.parse(worker.attributes)?.full_name;
};
