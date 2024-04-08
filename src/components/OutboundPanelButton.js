import React from "react";
import { IconButton } from "@twilio/flex-ui";
import styled from "@emotion/styled";
import { Actions, Manager } from "@twilio/flex-ui";
import { connect } from "react-redux";

function onCloseClick(actionType) {
  Actions.invokeAction(actionType);
}

function isOutboundCallingEnabled() {
  const { outbound_call_flows: flows } =
    Manager.getInstance().serviceConfiguration;
  return Boolean(flows && flows.default && flows.default.enabled);
}

const StyledIconButton = styled(IconButton)`
  margin-right: ${(props) => props.theme.tokens.spacings.space30};
  &:hover {
    background-color: ${(props) =>
    props.theme.tokens.backgroundColors.colorBackgroundInverseStrong};
  }
  &:focus-visible {
    border-color: ${(props) =>
      props.theme.tokens.borderColors.colorBorderInverse};
  }
`;

const OutboundPanelButton = (props) => {
  const {
    isOutboundDialerOpen,
    isOutboundMessagePanelOpen,
    outboundPanelType,
    isLiveVoiceCall,
    hasIncomingCallReservation,
  } = props;

  let icon = "Dialpad";
  let disabled =
    isLiveVoiceCall || hasIncomingCallReservation || isOutboundMessagePanelOpen;
  let actionType = "ToggleOutboundDialer";

  if (outboundPanelType === "voice" && !isOutboundCallingEnabled()) return null;

  if (outboundPanelType === "message") {
    icon = "Sms";
    disabled = isOutboundDialerOpen;
    actionType = "ToggleOutboundMessagePanel";
  }

  return (
    <StyledIconButton
      theme={props.theme}
      key={outboundPanelType}
      icon={icon}
      onClick={() => onCloseClick(actionType)}
      size="small"
      disabled={disabled}
    />
  );
};

const mapStateToProps = (state) => {
  const isOutboundDialerOpen = state.flex.view.isOutboundDialerOpen;
  const isOutboundMessagePanelOpen =
    state.flex.view.componentViewStates?.outboundMessagePanel
      ?.isOutboundMessagePanelOpen;
  return { isOutboundDialerOpen, isOutboundMessagePanelOpen };
};

export default connect(mapStateToProps)(OutboundPanelButton);
