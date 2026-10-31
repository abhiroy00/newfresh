import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { notificationsApi } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    // Order placed / arriving / delivered pushes use this channel (backend
    // sends channelId "orders"): HIGH shows a heads-up banner with sound.
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  await notificationsApi.registerToken(token, Platform.OS);
}

// Tapping an order push opens that order.
function openFromNotification(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as { type?: string; order_id?: string } | undefined;
  if (data?.type === 'order' && data.order_id) {
    router.push({ pathname: '/order/[id]', params: { id: data.order_id } });
  }
}

export function usePushNotifications(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().catch((e) => {
      console.warn('Push notification registration failed:', e);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web') return;
    // App opened from a killed state by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then(openFromNotification).catch(() => {});
    // Taps while the app is running or in the background.
    const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => sub.remove();
  }, [isAuthenticated]);
}
