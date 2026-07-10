import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function HomeScreen() {
  
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
