import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/theme';

export default function IndexRedirect() {
  const router = useRouter();
  const { isAuthenticated, hydrated } = useAuthStore();

  useEffect(() => {
    // Wait for the stored session to load — deciding earlier sends logged-in
    // users to the login screen whenever SecureStore is slow on cold start.
    if (!hydrated) return;
    if (isAuthenticated) {
      router.replace('/tabs');
    } else {
      router.replace('/auth/login');
    }
  }, [hydrated, isAuthenticated]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
