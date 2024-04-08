import React from "react";
import { FlexPlugin } from "@twilio/flex-plugin";
import OutboundMessagePanel from "./components/OutboundMessagePanel/OutboundMessagePanel.Container";
import OutboundPanelButton from "./components/OutboundPanelButton";
import "./actions/toggleOutboundMessagePanel";
import "./actions/sendOutboundMessage";
import registerNotifications from "./utils/notifications";
import { CustomizationProvider } from "@twilio-paste/core/customization";

const PLUGIN_NAME = "OutboundMessageCBM";

export default class OutboundMessageCBM extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   */
  async init(flex, manager) {
    flex.setProviders({
      PasteThemeProvider: CustomizationProvider,
    });

    registerNotifications(manager);

    flex.MainContainer.Content.add(
      <OutboundMessagePanel key="outbound-message-panel" />
    );

    // Remove the OOB button so that we can disable it when our panel is open
    flex.MainHeader.Content.remove("dialpad-button");
    flex.MainHeader.Content.add(
      <OutboundPanelButton
        outboundPanelType="message"
        key="message-dialpad-button"
      />,
      { sortOrder: 1, align: "end" }
    );
    flex.MainHeader.Content.add(
      <OutboundPanelButton
        outboundPanelType="voice"
        key="voice-dialpad-button"
      />,
      { sortOrder: 1, align: "end" }
    );
  }
}
