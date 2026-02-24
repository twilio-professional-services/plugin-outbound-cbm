import React, { useState, useEffect } from "react";
import { Dialer, Manager, useFlexSelector } from "@twilio/flex-ui";
import { Label } from "@twilio-paste/core/label";
import { TextArea } from "@twilio-paste/core/textarea";
import { Radio, RadioGroup } from "@twilio-paste/core/radio-group";
import { Text } from "@twilio-paste/core/text";
import { Select, Option } from "@twilio-paste/core/select";
import { HelpText } from "@twilio-paste/core/help-text";
import { Separator } from "@twilio-paste/core/separator";
import { Box } from "@twilio-paste/core/box";
import {
  Container,
  StyledSidePanel,
  DialerContainer,
  MessageContainer,
  SendMessageContainer,
  MessageTypeContainer,
  OfflineContainer,
  ErrorIcon,
} from "./OutboundMessagePanel.Components";
import SendMessageMenu from "./SendMessageMenu";
import { onSendClickHandler, handleClose } from "./clickHandlers";
import { templates } from "../../utils/templates";
import { PhoneNumberUtil, AsYouTypeFormatter } from "google-libphonenumber";
import { fetchContentTemplates } from "../../utils/fetchContentTemplates";

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
  const useContentTemplates = process.env.FLEX_APP_USE_CONTENT_TEMPLATES
    ? process.env.FLEX_APP_USE_CONTENT_TEMPLATES.toLowerCase() === "true"
    : false;
  const fromNumbers = process.env.FLEX_APP_TWILIO_FROM_NUMBER.split(',');
  const whatsappFromNumbers = process.env.FLEX_APP_TWILIO_WHATSAPP_FROM_NUMBER.split(',');
  const [fromNumber, setFromNumber] = useState(fromNumbers[0]);

  const isOutboundMessagePanelOpen = useFlexSelector(
    (state) =>
      state.flex.view.componentViewStates?.outboundMessagePanel
        ?.isOutboundMessagePanelOpen
  );
  const worker = useFlexSelector((state) => state.flex.worker);

  const toNumberValid = isToNumberValid(toNumber);
  const isWhatsApp = messageType === "whatsapp";
  const isToNumberInvalid = !toNumberValid;
  const isContentTemplateMissing = !contentTemplateSid;
  const isMessageBodyEmpty = !messageBody.length;

  const shouldBlockSend = isWhatsApp
    ? isToNumberInvalid || (isContentTemplateMissing && isMessageBodyEmpty)
    : isToNumberInvalid || isMessageBodyEmpty;

  let friendlyPhoneNumber = null;
  const formatter = new AsYouTypeFormatter();
  [...toNumber].forEach((c) => (friendlyPhoneNumber = formatter.inputDigit(c)));

  const handleSendClicked = (menuItemClicked) => {
    onSendClickHandler(
      menuItemClicked,
      toNumber,
      fromNumber,
      messageType,
      messageBody,
      contentTemplateSid
    );
  };

  useEffect(() => {
    if (messageType === "whatsapp") {
      setFromNumber(whatsappFromNumbers[0]);
      fetchContentTemplates().then((templates) =>
        setContentTemplates(templates || [])
      );
    } else {
      setFromNumber(fromNumbers[0]);
      // Clear content templates if messageType is not WhatsApp
      setContentTemplates([]);
      setContentTemplateSid("");
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

            {((messageType == "sms" && fromNumbers.length > 1) || (messageType == "whatsapp" && whatsappFromNumbers.length > 1)) && (
              <MessageContainer theme={props.theme}>
                <Label htmlFor="select_from_number">
                  Send message from
                </Label>
                <Select
                  id="select_from_number"
                  onChange={(e) => setFromNumber(e.target.value)}
                  value={fromNumber}
                >
                  <Option value="" disabled>Select a number</Option>
                  {(messageType == "whatsapp" ? whatsappFromNumbers : fromNumbers).map((number) => (
                    <Option value={number} key={number}>
                      {number}
                    </Option>
                  ))}
                </Select>
              </MessageContainer>
            )}

            {/* Conditional Rendering Based on Message Type */}
            <MessageContainer theme={props.theme}>
              {messageType === "whatsapp" && useContentTemplates ? (
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
                  {/* Message Input and Message selector*/}
                  <Label htmlFor="message-body">Message to send</Label>
                  <TextArea
                    onChange={(event) => {
                      setMessageBody(event.target.value);
                    }}
                    id="message-body"
                    name="message-body"
                    placeholder="Type message"
                    value={messageBody}
                  />

                  <Box backgroundColor="colorBackgroundBody">
                    <Separator
                      orientation="horizontal"
                      verticalSpacing="space50"
                    />
                  </Box>

                  <Label htmlFor="select_template">Select a Message</Label>
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
                  <HelpText>Choose a predefined message to send.</HelpText>
                </>
              )}
            </MessageContainer>

            <SendMessageContainer theme={props.theme}>
              <SendMessageMenu
                disableSend={shouldBlockSend}
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
