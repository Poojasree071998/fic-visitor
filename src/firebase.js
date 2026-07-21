import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDhraiu2aaCd39zu27-g72hsV7wHCMdYZ8",
  authDomain: "visitors-management-syst-f139a.firebaseapp.com",
  projectId: "visitors-management-syst-f139a",
  storageBucket: "visitors-management-syst-f139a.firebasestorage.app",
  messagingSenderId: "1075371075072",
  appId: "1:1075371075072:web:958b4322b95dd7502c1ae5",
  measurementId: "G-E0TM9V9FGG"
};

const app = initializeApp(firebaseConfig);

export let messaging = null;
import { isSupported } from "firebase/messaging";
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(console.error);

export { app };
