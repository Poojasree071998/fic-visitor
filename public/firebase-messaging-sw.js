importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDhraiu2aaCd39zu27-g72hsV7wHCMdYZ8",
  authDomain: "visitors-management-syst-f139a.firebaseapp.com",
  projectId: "visitors-management-syst-f139a",
  storageBucket: "visitors-management-syst-f139a.firebasestorage.app",
  messagingSenderId: "1075371075072",
  appId: "1:1075371075072:web:958b4322b95dd7502c1ae5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Background Message:", payload);

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo192.png"
  });
});
