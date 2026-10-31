import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlashMessage from 'react-native-flash-message';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import CartToast from '@/components/CartToast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    loadFromStorage();
  }, []);

  // When a live session ends (refresh token rejected by the server), send the
  // user to login instead of leaving them on a screen where every call fails.
  const router = useRouter();
  const wasAuthenticated = useRef(false);
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      router.replace('/auth/login');
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  usePushNotifications(isAuthenticated);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#effeeb' },
          }}
        />
        <FlashMessage position="top" />
        <CartToast />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
