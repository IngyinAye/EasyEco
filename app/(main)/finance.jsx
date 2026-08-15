import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  deleteStoredNotification,
  getNotificationHistory,
  markNotificationRead,
} from '../utils/notificationStore';
import { useLanguage } from '../context/LanguageContext';

function getGroupLabel(createdAt) {
  const date = new Date(createdAt);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = Math.round((startOfToday - startOfDate) / 86400000);

  if (difference === 0) return 'Today';
  if (difference === 1) return 'Yesterday';
  if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()) return 'This month';
  return date.toLocaleDateString();
}

function getRelativeTime(createdAt) {
  const difference = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.max(1, Math.floor(difference / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

function getIcon(type) {
  if (type === 'auth') return 'person-circle-outline';
  if (type === 'daily_tip') return 'bulb-outline';
  return 'notifications-outline';
}

export default function NotificationPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const items = await getNotificationHistory();
    setNotifications(items);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useFocusEffect(useCallback(() => {
    loadNotifications();
  }, [loadNotifications]));

  const markAsRead = async (id) => {
    const items = await markNotificationRead(id);
    setNotifications(items);
  };

  const deleteNotification = (id) => {
    Alert.alert(t('deleteNotification'), t('deleteNotificationMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => setNotifications(await deleteStoredNotification(id)),
      },
    ]);
  };

  const groupedNotifications = notifications.reduce((groups, item) => {
    const label = getGroupLabel(item.createdAt);
    groups[label] = groups[label] || [];
    groups[label].push(item);
    return groups;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        
        <Text style={styles.headerTitle}>{t('notifications')}</Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={54} color="#8E9DB0" />
          <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
          <Text style={styles.emptyText}>{t('notificationEmpty')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} />}
        >
          {Object.entries(groupedNotifications).map(([label, items]) => (
            <View key={label} style={styles.section}>
              <Text style={styles.sectionTitle}>{label}</Text>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, !item.read && styles.unreadCard]}
                  onPress={() => markAsRead(item.id)}
                  onLongPress={() => deleteNotification(item.id)}
                >
                  <View style={styles.iconBox}>
                    <Ionicons name={getIcon(item.type)} size={27} color="#0D2A4A" />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                      <Text style={styles.time}>{getRelativeTime(item.createdAt)}</Text>
                    </View>
                    {!!item.body && <Text style={styles.body} numberOfLines={2} ellipsizeMode="tail">{item.body}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 14 },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { marginTop: 14, color: '#2167E1', fontSize: 24, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 28, paddingBottom: 36 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#0D2A4A', fontSize: 18, fontWeight: '700', marginBottom: 9 },
  card: { flexDirection: 'row', backgroundColor: '#E8EDF3', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 10, marginBottom: 9 },
  unreadCard: { backgroundColor: '#E3EAF4' },
  iconBox: { width: 38, alignItems: 'center', paddingTop: 1 },
  cardContent: { flex: 1, paddingLeft: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  title: { flex: 1, color: '#0D2A4A', fontSize: 14, lineHeight: 18, fontWeight: '600' },
  time: { color: '#8E9DB0', fontSize: 11, paddingTop: 1 },
  body: { color: '#55749D', fontSize: 12, lineHeight: 16, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyTitle: { color: '#0D2A4A', fontSize: 19, fontWeight: '700', marginTop: 14 },
  emptyText: { color: '#8E9DB0', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
