#!/bin/bash

# ----- CONFIG -----
WORKSPACE_NAME="Flex Task Assignment"
QUEUE_NAME="Everyone"
WORKFLOW_NAME="outbound-cbm-workflow"
STUDIO_FLOW_NAME="inbound-cbm-flow"
ENV_OUTPUT_FILE="$(dirname "$0")/../.env"
# ------------------

echo "🔍 Locating Workspace..."
WORKSPACE_SID=$(twilio api:taskrouter:v1:workspaces:list | grep "$WORKSPACE_NAME" | awk '{print $1}')
if [ -z "$WORKSPACE_SID" ]; then
  echo "❌ Workspace '$WORKSPACE_NAME' not found."
  exit 1
fi
echo "✅ Workspace SID: $WORKSPACE_SID"

echo "🔍 Locating exact queue '$QUEUE_NAME'..."
QUEUE_SID=$(twilio api:taskrouter:v1:workspaces:task-queues:list \
  --workspace-sid "$WORKSPACE_SID" --limit 100 | awk -v name="$QUEUE_NAME" '$0 ~ name && $2 == name { print $1 }')
if [ -z "$QUEUE_SID" ]; then
  echo "❌ Queue '$QUEUE_NAME' not found."
  exit 1
fi
echo "✅ Found existing Queue SID: $QUEUE_SID"

echo "🔍 Fetching 'chat' channel SID..."
CHANNEL_SID=$(twilio api:taskrouter:v1:workspaces:task-channels:list \
  --workspace-sid "$WORKSPACE_SID" --limit 20 | awk '$2 == "chat" { print $1 }')
if [ -z "$CHANNEL_SID" ]; then
  echo "❌ Failed to find 'chat' TaskChannel SID."
  exit 1
fi
echo "✅ TaskChannel SID: $CHANNEL_SID"

echo "🔍 Looking for Workflow '$WORKFLOW_NAME'..."
WORKFLOW_SID=$(twilio api:taskrouter:v1:workspaces:workflows:list \
  --workspace-sid "$WORKSPACE_SID" --limit 50 | awk -v name="$WORKFLOW_NAME" '$2 == name { print $1 }')

if [ -z "$WORKFLOW_SID" ]; then
  echo "➕ Creating Workflow '$WORKFLOW_NAME'..."
  WORKFLOW_SID=$(twilio api:taskrouter:v1:workspaces:workflows:create \
    --workspace-sid "$WORKSPACE_SID" \
    --friendly-name "$WORKFLOW_NAME" \
    --configuration "{\"task_routing\":{\"filters\":[{\"filter_friendly_name\":\"Known Agent Routing Filter\",\"expression\":\"KnownAgentRoutingFlag == 'true'\",\"targets\":[{\"queue\":\"$QUEUE_SID\",\"known_worker_sid\":\"task.KnownAgentWorkerSid\"}]}],\"default_filter\":{\"queue\":\"$QUEUE_SID\"}}}" \
    | grep '^sid' | awk '{print $2}')

  if [ -z "$WORKFLOW_SID" ]; then
    echo "❌ Failed to create Workflow."
    exit 1
  fi
  echo "✅ Created Workflow SID: $WORKFLOW_SID"
else
  echo "✅ Found existing Workflow SID: $WORKFLOW_SID"
fi

echo "🔍 Checking for Studio Flow '$STUDIO_FLOW_NAME'..."
STUDIO_FLOW_SID=$(twilio api:studio:v2:flows:list --limit 20 | grep -B1 "$STUDIO_FLOW_NAME" | grep '^sid' | awk '{print $2}')
if [ -z "$STUDIO_FLOW_SID" ]; then
  echo "➕ Creating Studio Flow '$STUDIO_FLOW_NAME'..."

  STUDIO_FLOW_SID=$(twilio api:studio:v2:flows:create \
    --friendly-name "$STUDIO_FLOW_NAME" \
    --status published \
    --definition "{
      \"description\":\"Inbound CBM Flow\",
      \"states\":[
        {
          \"name\":\"Trigger\",
          \"type\":\"trigger\",
          \"transitions\":[
            {\"event\":\"incomingMessage\",\"next\":\"send_to_flex_1\"}
          ],
          \"properties\":{\"offset\":{\"x\":0,\"y\":0}}
        },
        {
          \"name\":\"send_to_flex_1\",
          \"type\":\"send-to-flex\",
          \"transitions\":[],
          \"properties\":{
            \"workflow\":\"$WORKFLOW_SID\",
            \"channel\":\"$CHANNEL_SID\",
            \"attributes\":\"{\\\"KnownAgentRoutingFlag\\\":\\\"{{trigger.conversation.ChannelAttributes.KnownAgentRoutingFlag}}\\\", \\\"KnownAgentWorkerSid\\\":\\\"{{trigger.conversation.ChannelAttributes.KnownAgentWorkerSid}}\\\"}\",
            \"priority\":\"0\",
            \"timeout\":\"3600\",
            \"offset\":{\"x\":100,\"y\":100}
          }
        }
      ],
      \"initial_state\":\"Trigger\",
      \"flags\":{\"allow_concurrent_calls\":true}
    }" \
    2> studio_flow_error.log | grep -Eo '^FW[a-zA-Z0-9]+')

  if [ -z "$STUDIO_FLOW_SID" ]; then
    echo "❌ Failed to create Studio Flow."
    exit 1
  fi
  echo "✅ Created Studio Flow SID: $STUDIO_FLOW_SID"
else
  echo "✅ Found existing Studio Flow SID: $STUDIO_FLOW_SID"
fi

echo ""
echo "✅ All SIDs generated:"
echo "--------------------------------------------"
echo "FLEX_APP_WORKSPACE_SID=$WORKSPACE_SID"
echo "FLEX_APP_QUEUE_SID=$QUEUE_SID"
echo "FLEX_APP_WORKFLOW_SID=$WORKFLOW_SID"
echo "FLEX_APP_TASKCHANNEL_SID=$CHANNEL_SID"
echo "FLEX_APP_INBOUND_STUDIO_FLOW=$STUDIO_FLOW_SID"
echo "--------------------------------------------"

echo "💾 Writing to $ENV_OUTPUT_FILE..."
cat <<EOF >> "$ENV_OUTPUT_FILE"
FLEX_APP_WORKSPACE_SID=$WORKSPACE_SID
FLEX_APP_QUEUE_SID=$QUEUE_SID
FLEX_APP_WORKFLOW_SID=$WORKFLOW_SID
FLEX_APP_TASKCHANNEL_SID=$CHANNEL_SID
FLEX_APP_INBOUND_STUDIO_FLOW=$STUDIO_FLOW_SID
EOF

echo "✅ Done. Environment variables written to $ENV_OUTPUT_FILE"
§§§§§