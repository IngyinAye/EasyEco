import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Image, ScrollView,
  Alert, SafeAreaView, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useUsage } from '../Usage/UsageContext';

const ICON_MAP = {
  fridge: require('../../assets/Refigerator.png'),
  ac: require('../../assets/Air_conditioner.png'),
  washing: require('../../assets/Washing_machine.png'),
  bulb: require('../../assets/Electric_bulb.png'),
  fan: require('../../assets/Electric_fan.png'),
  tv: require('../../assets/Television.png'),
  iron: require('../../assets/Electric_iron.png'),
  microwave: require('../../assets/Microwave_oven.png'),
  rice: require('../../assets/Rice_cooker.png'),
  pot: require('../../assets/Cooking_pot.png'),
  kettle: require('../../assets/Electric_kettle.png'),
  vacuum: require('../../assets/Vacuum_cleaner.png'),
};

const CATEGORY_ICON_MAP = {
  refrigerator: 'fridge', ac: 'ac', washing: 'washing', bulb: 'bulb',
  fan: 'fan', tv: 'tv', iron: 'iron', microwave: 'microwave',
  rice: 'rice', pot: 'pot', kettle: 'kettle', vacuum: 'vacuum',
};

const HOUR_DATA = Array.from({ length: 25 }, (_, i) => i);
const MINUTE_DATA = Array.from({ length: 12 }, (_, i) => i * 5);

const BackIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EditIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrashIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function MyDevices() {
  const router = useRouter();
  const { getAllDevices, deleteDevice, updateDevice } = useUsage();
  const rawDevices = getAllDevices();

  const [showPicker, setShowPicker] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [tempHour, setTempHour] = useState(8);
  const [tempMinute, setTempMinute] = useState(0);

  const parseTimeString = (timeStr) => {
    if (!timeStr) return { hours: 8, minutes: 0 };
    const match = timeStr.match(/(\d+)\s*hr\s*(\d+)\s*mins?/i);
    if (match) {
      return {
        hours: parseInt(match[1], 10),
        minutes: parseInt(match[2], 10),
      };
    }
    return { hours: 8, minutes: 0 };
  };

  const devices = rawDevices.map((d) => ({
    ...d,
    iconType: CATEGORY_ICON_MAP[d.categoryId] || 'bulb',
  }));

  const handleEditPress = (item) => {
    const { hours, minutes } = parseTimeString(item.time);
    setSelectedItem(item);
    setTempHour(hours);
    setTempMinute(minutes);
    setShowPicker(true);
  };

  const handleConfirmTime = () => {
    if (selectedItem && updateDevice) {
      const formattedTime = `${tempHour}hr${tempMinute} mins`;
      updateDevice(selectedItem.id, {
        ...selectedItem,
        time: formattedTime,
        durationHours: tempHour + (tempMinute / 60),
      });
    }
    setShowPicker(false);
    setSelectedItem(null);
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Device', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDevice(item.id) },
    ]);
  };

  const renderIcon = (type) => {
    const src = ICON_MAP[type];
    if (src) return <Image source={src} style={styles.deviceIcon} />;
    return (
      <View style={styles.fallbackIcon}>
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Path d="M12 3V21M3 12H21" stroke="#6B7280" strokeWidth="2" />
        </Svg>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My devices</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {devices.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No devices added yet.</Text>
            <Text style={styles.emptySub}>Tap + to add your first device.</Text>
          </View>
        )}

        {devices.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardLeft}>
              {renderIcon(item.iconType)}
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.watt} | {item.time}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditPress(item)} hitSlop={8}>
                <EditIcon />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)} hitSlop={8}>
                <TrashIcon />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {showPicker && (
        <View style={styles.pickerOverlay}>
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          />
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.pickerCancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Time</Text>
              <TouchableOpacity onPress={handleConfirmTime}>
                <Text style={styles.pickerDoneBtn}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.wheelsContainer}>
              <View style={styles.wheelColumn}>
                <Text style={styles.wheelLabel}>Hour</Text>
                <View style={styles.wheelWrapper}>
                  <View style={styles.selectionIndicator} />
                  <FlatList
                    data={HOUR_DATA}
                    keyExtractor={(item) => `h-${item}`}
                    renderItem={({ item }) => (
                      <View style={[styles.wheelItem, tempHour === item && styles.wheelItemActive]}>
                        <Text style={[styles.wheelItemText, tempHour === item && styles.wheelItemTextActive]}>
                          {item}
                        </Text>
                      </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={40}
                    decelerationRate="fast"
                    scrollEventThrottle={16}
                    getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
                    initialScrollIndex={tempHour}
                    onMomentumScrollEnd={(e) => {
                      const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                      if (index >= 0 && index < HOUR_DATA.length) setTempHour(HOUR_DATA[index]);
                    }}
                    ListHeaderComponent={<View style={{ height: 80 }} />}
                    ListFooterComponent={<View style={{ height: 80 }} />}
                  />
                </View>
              </View>

              <View style={styles.wheelColumn}>
                <Text style={styles.wheelLabel}>Minute</Text>
                <View style={styles.wheelWrapper}>
                  <View style={styles.selectionIndicator} />
                  <FlatList
                    data={MINUTE_DATA}
                    keyExtractor={(item) => `m-${item}`}
                    renderItem={({ item }) => (
                      <View style={[styles.wheelItem, tempMinute === item && styles.wheelItemActive]}>
                        <Text style={[styles.wheelItemText, tempMinute === item && styles.wheelItemTextActive]}>
                          {item.toString().padStart(2, '0')}
                        </Text>
                      </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={40}
                    decelerationRate="fast"
                    scrollEventThrottle={16}
                    getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
                    initialScrollIndex={Math.min(Math.max(MINUTE_DATA.indexOf(tempMinute), 0), MINUTE_DATA.length - 1)}
                    onMomentumScrollEnd={(e) => {
                      const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                      if (index >= 0 && index < MINUTE_DATA.length) setTempMinute(MINUTE_DATA[index]);
                    }}
                    ListHeaderComponent={<View style={{ height: 80 }} />}
                    ListFooterComponent={<View style={{ height: 80 }} />}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deviceIcon: { width: 40, height: 40, resizeMode: 'contain', marginRight: 12 },
  fallbackIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardText: { justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#6B7280' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: { padding: 4 },

  pickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerCancelBtn: { fontSize: 16, color: '#6B7280' },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  pickerDoneBtn: { fontSize: 16, fontWeight: '600', color: '#3B82F6' },
  wheelsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    height: 280,
  },
  wheelColumn: { alignItems: 'center', marginHorizontal: 24 },
  wheelLabel: {
    fontSize: 13, fontWeight: '600', color: '#6B7280',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  wheelWrapper: { height: 200, width: 80, overflow: 'hidden' },
  selectionIndicator: {
    position: 'absolute',
    top: 80, left: 0, right: 0,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    zIndex: -1,
  },
  wheelItem: { height: 40, justifyContent: 'center', alignItems: 'center' },
  wheelItemText: { fontSize: 18, color: '#9CA3AF' },
  wheelItemTextActive: { color: '#111827', fontWeight: '700' },
});