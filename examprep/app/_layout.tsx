import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, Platform } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Inject web CSS reset to eliminate browser body margin and prevent bottom clipping
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.documentElement.style.overflow = 'hidden';
      const root = document.getElementById('root');
      if (root) {
        root.style.height = '100%';
        root.style.overflow = 'hidden';
      }
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/dashboard');
    }
  }, [session, loading, segments]);

  return (
    <View style={styles.appContainer}>
      <View style={styles.appShell}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, height: '100%', backgroundColor: Colors.bg }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    height: '100%',
    backgroundColor: Platform.OS === 'web' ? '#F4F4F5' : Colors.bg,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  appShell: {
    flex: 1,
    height: '100%',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 500 : '100%',
    backgroundColor: Colors.bg,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: Colors.border,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 24,
    } : {}),
  },
});
