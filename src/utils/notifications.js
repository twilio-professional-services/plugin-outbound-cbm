import { Notifications, NotificationType } from "@twilio/flex-ui";

const registerOutboundMessageFailed = (manager) => {
  manager.strings.outboundMessageFailed =
    'Outbound Message failed: "{{message}}"';
  Notifications.registerNotification({
    id: "outboundMessageFailed",
    content: "outboundMessageFailed", // template
    closeButton: false,
    timeout: 6000,
    type: NotificationType.error,
  });
};

const registerOutboundMessageSent = (manager) => {
  manager.strings.outboundMessageSent = 'Message sent to "{{message}}"';
  Notifications.registerNotification({
    id: "outboundMessageSent",
    content: "outboundMessageSent", // template
    timeout: 3000,
    type: NotificationType.info,
  });
};

const registerNotifications = (manager) => {
  registerOutboundMessageFailed(manager);
  registerOutboundMessageSent(manager);
};

export default registerNotifications;
