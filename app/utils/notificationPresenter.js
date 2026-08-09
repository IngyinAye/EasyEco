import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import { saveNotification } from './notificationStore';

const NOTIFICATION_CHANNEL_ID = 'easyeco_default';

export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;

  await notifee.createChannel({
    id: NOTIFICATION_CHANNEL_ID,
    name: 'EasyEco notifications',
    importance: AndroidImportance.HIGH,
  });
}

export async function presentNotification({ title, body, type = 'general' }) {
  const storedNotification = await saveNotification({ title, body, type });

  try {
    await ensureNotificationChannel();

    await notifee.displayNotification({
      id: storedNotification.id,
      title,
      body,
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        smallIcon: 'ic_stat_easyeco',
        pressAction: { id: 'default' },
      },
    });
  } catch (error) {
    console.log('System notification display error:', error);
  }
}

export async function presentRemoteNotification(remoteMessage) {
  const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'EasyEco';
  const body = remoteMessage.notification?.body || remoteMessage.data?.body || '';
  const type = remoteMessage.data?.type || 'daily_tip';
  await presentNotification({ title, body, type });
}
