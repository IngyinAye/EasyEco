import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { Stack } from 'expo-router';
import messaging from '@react-native-firebase/messaging';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UsageProvider } from './Usage/UsageContext';
import { LanguageProvider } from './context/LanguageContext';
import { ensureNotificationChannel, presentRemoteNotification } from './utils/notificationPresenter';
import { getUser } from './utils/authStorage';

const DAILY_TIPS_TOPIC = 'daily_energy_tips';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  await presentRemoteNotification(remoteMessage);
});

export default function RootLayout() {
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Android 13+ requires this runtime permission before notifications can appear.
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const permissionResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );

          if (permissionResult !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Notification permission denied.');
            return;
          }
        }

        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        // Firebase permission status is needed for iOS. Android is handled above.
        if (Platform.OS === 'ios' && !enabled) {
          console.log('Notification permission denied.');
          return;
        }

        await ensureNotificationChannel();
        const token = await messaging().getToken();
        console.log('Device FCM Token:', token);

        // Topic subscriptions can be lost when Firebase rotates the device token.
        // Restore it whenever a signed-in user opens the app.
        const user = await getUser();
        if (user?.token) {
          await messaging().subscribeToTopic(DAILY_TIPS_TOPIC);
          console.log(`Subscribed to topic: ${DAILY_TIPS_TOPIC}`);
        }

        await messaging().unsubscribeFromTopic('all_users');
        console.log('Unsubscribed from topic: all_users');
      } catch (error) {
        console.log('Notification setup error:', error);
      }
    };

    setupNotifications();

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Foreground Notification Received:', remoteMessage);
      await presentRemoteNotification(remoteMessage);
    });

    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async () => {
      try {
        const user = await getUser();
        if (user?.token) {
          await messaging().subscribeToTopic(DAILY_TIPS_TOPIC);
          console.log(`Re-subscribed to topic after token refresh: ${DAILY_TIPS_TOPIC}`);
        }
      } catch (error) {
        console.log('Notification token refresh error:', error);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeTokenRefresh();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <UsageProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(main)" options={{ headerShown: false }} />
            <Stack.Screen name="UsageDetail" options={{ presentation: 'transparentModal', headerShown: false }} />
          </Stack>
        </UsageProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
