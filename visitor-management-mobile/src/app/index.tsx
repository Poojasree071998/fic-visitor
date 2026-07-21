import { StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect, useState, useRef } from 'react';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Determine if we are running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existingPermission =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingPermission.status;

    if (finalStatus !== 'granted') {
      const requestedPermission =
        await Notifications.requestPermissionsAsync();

      finalStatus = requestedPermission.status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission was denied.');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('EAS project ID was not found.');
      return null;
    }

    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    console.log('Expo push token:', tokenResponse.data);

    return tokenResponse.data;
  } catch (error) {
    console.log('Push token error:', error);
    return null;
  }
}

export default function HomeScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [expoPushToken, setExpoPushToken] = useState('');
  const webviewRef = useRef<any>(null);
  
  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!micPermission?.granted) {
        await requestMicPermission();
      }
    })();
  }, [cameraPermission, micPermission]);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) setExpoPushToken(token);
    });
  }, []);
  
  // ==========================================
  // ==========================================
  // 👇 PASTE YOUR LIVE VERCEL/RENDER URL HERE 👇
  // ==========================================
  const TARGET_URL = 'http://192.168.1.27:5173';
  
  const INJECTED_JS = `
    if ('${expoPushToken}') {
      window.REACT_NATIVE_PUSH_TOKEN = '${expoPushToken}';
    }
    true;
  `;
  
  return (
    <SafeAreaView style={styles.container}>
      <WebView 
        ref={webviewRef}
        source={{ uri: TARGET_URL }} 
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        injectedJavaScript={INJECTED_JS}
        onError={(e) => console.log('WEBVIEW ERROR:', e.nativeEvent)}
        onHttpError={(e) => console.log('HTTP ERROR:', e.nativeEvent)}
        onLoadEnd={() => {
           if (expoPushToken && webviewRef.current) {
             webviewRef.current.injectJavaScript(INJECTED_JS);
           }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Matches the web app theme
  },
  webview: {
    flex: 1,
  },
});
