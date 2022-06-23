import { Actions, Manager } from "@twilio/flex-ui";

Actions.registerAction("ToggleOutboundMessagePanel", () => {
  const isOutboundMessagePanelOpen =
    !!Manager.getInstance().store.getState()["flex"].view.componentViewStates
      ?.outboundMessagePanel?.isOutboundMessagePanelOpen;

  Actions.invokeAction("SetComponentState", {
    name: "outboundMessagePanel",
    state: { isOutboundMessagePanelOpen: !isOutboundMessagePanelOpen },
  });
});
