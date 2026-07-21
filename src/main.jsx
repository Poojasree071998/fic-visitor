import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";

// Intercept all fetch requests to automatically append multi-tenant headers
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const isApiCall = typeof url === 'string' && (url.includes('/api/') || url.startsWith(import.meta.env.VITE_API_URL || ''));
  const isPublicCall = typeof url === 'string' && (
    url.includes('/api/visitors/pass/') || 
    url.includes('/api/visitors/upload') || 
    url.includes('/api/auth/register-company') || 
    url.includes('/api/auth/mock-payment')
  );

  if (isApiCall && !isPublicCall) {
    const savedUser = localStorage.getItem('zmvms_user') || sessionStorage.getItem('zmvms_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const headers = options.headers ? { ...options.headers } : {};
        
        const existingKeys = Object.keys(headers).map(k => k.toLowerCase());
        
        if (!existingKeys.includes('x-company-id')) headers['X-Company-Id'] = user.companyId || '';
        if (!existingKeys.includes('x-user-id')) headers['X-User-Id'] = user.id || '';
        if (!existingKeys.includes('x-user-role')) headers['X-User-Role'] = user.role || '';
        if (!existingKeys.includes('authorization') && user.token) headers['Authorization'] = `Bearer ${user.token}`;
        
        options.headers = headers;
      } catch (e) {
        console.error('Error parsing user for fetch interceptor:', e);
      }
    }
  }

  const response = await originalFetch(url, options);

  if (response.status === 403) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      if (data.message && (
        data.message.includes('expired') || 
        data.message.includes('inactive') || 
        data.message.includes('suspended') ||
        data.message.includes('Suspended') ||
        data.message.includes('Inactive') ||
        data.message.includes('status') ||
        data.message.includes('Limit') ||
        data.message.includes('Limit Exceeded')
      )) {
        window.dispatchEvent(new CustomEvent('subscription-lock', { detail: data.message }));
      }
    } catch (e) {}
  }

  return response;
};

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

async function requestNotificationPermission() {
  try {
    if (!('Notification' in window) || !messaging) {
      console.log("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BMi4WOvwwzgiCpfLZj4rtSWDM0bHHL1ciowr6sbaGD6aQjSWsrkKae0Cfale0Q-Z8huo8grneu2XI5pEzfREgV"
      });

      console.log("FCM Token:", token);
    } else {
      console.log("Notification permission denied");
    }
  } catch (err) {
    console.error(err);
  }
}

requestNotificationPermission();
