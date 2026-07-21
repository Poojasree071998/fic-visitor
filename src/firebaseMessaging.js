import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";

export const requestNotificationPermission = async () => {
  if (!('Notification' in window) || !messaging) {
    console.log("This browser does not support notifications.");
    return;
  }
  
  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    const token = await getToken(messaging, {
      vapidKey: "BMi4WOvwwzgiCpfLZj4rtSWDM0bHHL1ciowr6sbaGD6aQjSWsrkKae0Cfale0Q-Z8huo8grneu2XI5pEzfREgVA"
    });

    console.log("FCM Token:", token);

    return token;
  }
};

export const listenNotification = () => {
  if (!messaging) {
    console.log("Messaging not supported, skipping onMessage listener.");
    return;
  }
  onMessage(messaging, (payload) => {
    console.log("Notification Received:", payload);

    alert(payload.notification.title + "\n" + payload.notification.body);
  });
};
