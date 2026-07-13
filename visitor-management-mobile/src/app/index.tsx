import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect } from 'react';

export default function HomeScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
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
  
  // ==========================================
  // 👇 PASTE YOUR LIVE VERCEL/RENDER URL HERE 👇
  // ==========================================
  const TARGET_URL = 'https://zone-monitor.vercel.app'; 
  
  return (
    <SafeAreaView style={styles.container}>
      <WebView 
        source={{ uri: TARGET_URL }} 
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
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
