import React, { useState, useEffect } from "react";
import { Dialer, Manager, useFlexSelector } from "@twilio/flex-ui";
import {
  Label,
  TextArea,
  RadioGroup,
  Radio,
  Text,
  Select,
  Option,
  HelpText,
  Separator,
  Box,
} from "@twilio-paste/core";
import {
  Container,
  StyledSidePanel,
  DialerContainer,
  MessageContainer,
  SendMessageContainer,
  MessageTypeContainer,
} from "./OutboundMessagePanel.Components";
import SendMessageMenu from "./SendMessageMenu";
import { onSendClickHandler, handleClose } from "./clickHandlers";
import { templates } from "../../utils/templates";
import { PhoneNumberUtil, AsYouTypeFormatter } from "google-libphonenumber";

const isWorkerAvailable = (worker) => {
  const { taskrouter_offline_activity_sid } =
    Manager.getInstance().serviceConfiguration;

  return worker.activity?.sid !== taskrouter_offline_activity_sid;
};

const isToNumberValid = (toNumber) => {
  const phoneUtil = PhoneNumberUtil.getInstance();
  try {
    const parsedToNumber = phoneUtil.parse(toNumber);
    if (phoneUtil.isPossibleNumber(parsedToNumber))
      if (phoneUtil.isValidNumber(parsedToNumber)) return true;

    return false;
  } catch (error) {
    return false;
  }
};

const OutboundMessagePanel = (props) => {
  const [toNumber, setToNumber] = useState("+1");
  const [messageBody, setMessageBody] = useState("");
  const [messageType, setMessageType] = useState("sms");
  const [contentTemplateSid, setContentTemplateSid] = useState("");
  const [contentTemplates, setContentTemplates] = useState([]);

  const isOutboundMessagePanelOpen = useFlexSelector(
    (state) =>
      state.flex.view.componentViewStates?.outboundMessagePanel
        ?.isOutboundMessagePanelOpen
  );
  const worker = useFlexSelector((state) => state.flex.worker);

  let disableSend = true;
  const toNumberValid = isToNumberValid(toNumber);

  if (toNumberValid && messageBody.length) disableSend = false;

  let friendlyPhoneNumber = null;
  const formatter = new AsYouTypeFormatter();
  [...toNumber].forEach((c) => (friendlyPhoneNumber = formatter.inputDigit(c)));

  const handleSendClicked = (menuItemClicked) => {
    onSendClickHandler(
      menuItemClicked,
      toNumber,
      messageType,
      messageBody,
      contentTemplateSid
    );
  };

  useEffect(() => {
    const fetchContentTemplates = async () => {
      try {
        const response = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/getContentTemplates`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
          },
          mode: 'cors',
      });
        const data = await response.json();
        setContentTemplates(data.templates);
      } catch (error) {
        console.error("Error fetching content templates:", error);
      }
    };

    if (messageType === "whatsapp") {
      fetchContentTemplates();
    } else {
      // Clear content templates if messageType is not WhatsApp
      setContentTemplates([]);
    }
  }, [messageType]);

  if (!isOutboundMessagePanelOpen) {
    if (toNumber !== "+1") setToNumber("+1");
    if (messageBody.length) setMessageBody("");
    return null;
  }

  return (
    <Container>
      <StyledSidePanel
        displayName="Message"
        themeOverride={props.theme && props.theme.OutboundDialerPanel}
        handleCloseClick={handleClose}
        title="Message"
      >
        {isWorkerAvailable(worker) && (
          <>
            {/* Message Type Selection */}
            <MessageTypeContainer theme={props.theme}>
              <RadioGroup
                name="messageType"
                value={messageType}
                legend="Message type"
                onChange={(newValue) => {
                  setMessageType(newValue);
                  setMessageBody("");
                  setContentTemplateSid("");
                }}
                orientation="horizontal"
              >
                <Radio id="sms" value="sms" name="sms">
                  SMS
                </Radio>
                <Radio id="whatsapp" value="whatsapp" name="whatsapp">
                  WhatsApp
                </Radio>
              </RadioGroup>
              <Text
                paddingTop={props.theme.tokens.spacings.space20}
                color={
                  toNumberValid
                    ? props.theme.tokens.textColors.colorTextSuccess
                    : props.theme.tokens.textColors.colorTextErrorLight
                }
              >
                {messageType === "whatsapp"
                  ? "whatsapp:" + toNumber
                  : friendlyPhoneNumber}
              </Text>
            </MessageTypeContainer>

            {/* Dialer */}
            <DialerContainer theme={props.theme}>
              <Dialer
                key="dialer"
                onDial={setToNumber}
                defaultPhoneNumber={toNumber}
                onPhoneNumberChange={setToNumber}
                hideActions
                disabled={false}
                defaultCountryAlpha2Code={"US"}
              />
            </DialerContainer>

            {/* Conditional Rendering Based on Message Type */}
            <MessageContainer theme={props.theme}>
              {messageType === "whatsapp" ? (
                <>
                  {/* Content Templates Dropdown for WhatsApp */}
                  <Label htmlFor="select_content_template">
                    Select a Content Template
                  </Label>
                  <Select
                    id="select_content_template"
                    onChange={(e) => setContentTemplateSid(e.target.value)}
                    value={contentTemplateSid}
                  >
                    <Option value="">Select a template</Option>
                    {contentTemplates.map((template) => (
                      <Option value={template.sid} key={template.sid}>
                        {template.name}
                      </Option>
                    ))}
                  </Select>
                  <HelpText>
                    Choose a content template to send via WhatsApp.
                  </HelpText>
                </>
              ) : (
                <>
                  {/* Message Input and Templates for SMS */}
                  <Label htmlFor="message-body">Message to send</Label>
                  <TextArea
                    theme={props.theme}
                    onChange={(event) => {
                      setMessageBody(event.target.value);
                    }}
                    id="message-body"
                    name="message-body"
                    placeholder="Type message"
                    value={messageBody}
                  />
                  <SendMessageContainer theme={props.theme}>
                    <SendMessageMenu
                      disableSend={disableSend}
                      onClickHandler={handleSendClicked}
                    />
                  </SendMessageContainer>

                  <Box
                    backgroundColor="colorBackgroundBody"
                    padding="space50"
                  >
                    <Separator
                      orientation="horizontal"
                      verticalSpacing="space50"
                    />
                  </Box>

                  <Label htmlFor="select_template">
                    Select a Message Template
                  </Label>
                  <Select
                    id="select_template"
                    onChange={(e) => setMessageBody(e.target.value)}
                    value={messageBody}
                  >
                    {templates.map((template) => (
                      <Option value={template} key={template}>
                        {template || "Type message"}
                      </Option>
                    ))}
                  </Select>
                  <HelpText>
                    Choose a predefined message template for SMS.
                  </HelpText>
                </>
              )}
            </MessageContainer>

            {/* Send Message Button */}
            <SendMessageContainer theme={props.theme}>
              <SendMessageMenu
                disableSend={
                  messageType === "whatsapp"
                    ? !toNumberValid || !contentTemplateSid
                    : !toNumberValid || !messageBody.length
                }
                onClickHandler={handleSendClicked}
              />
            </SendMessageContainer>
          </>
        )}
        {!isWorkerAvailable(worker) && (
          <OfflineContainer theme={props.theme}>
            <ErrorIcon />
            {`To send a message, please change your status from ${worker.activity.name}`}
          </OfflineContainer>
        )}
      </StyledSidePanel>
    </Container>
  );
};

export default OutboundMessagePanel;