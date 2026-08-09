import { StyleSheet, Text, View, TouchableOpacity, Image, TextInput, Modal, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
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

const BackIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

function TimePickerModal({ visible, onCancel, onDone, initialHour = 0, initialMinute = 0 }) {
  const [selectedHour, setSelectedHour] = useState(initialHour);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  useEffect(() => {
    if (visible) {
      setSelectedHour(initialHour);
      setSelectedMinute(initialMinute);
      setTimeout(() => {
        hourRef.current?.scrollTo({ y: initialHour * ITEM_HEIGHT, animated: false });
        minuteRef.current?.scrollTo({ y: initialMinute * ITEM_HEIGHT, animated: false });
      }, 100);
    }
  }, [visible, initialHour, initialMinute]);

  const handleHourScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    setSelectedHour(Math.max(0, Math.min(23, idx)));
  };

  const handleMinuteScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    setSelectedMinute(Math.max(0, Math.min(59, idx)));
  };

  const renderItem = (num, isSelected) => (
    <View style={[styles.timeItem, isSelected && styles.timeItemActive]}>
      <Text style={[styles.timeItemText, isSelected && styles.timeItemTextActive]}>
        {String(num).padStart(2, '0')}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.timePickerWrapper}>
          <View style={styles.timePickerHeader}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.timePickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={() => onDone(selectedHour, selectedMinute)}>
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timePickerBody}>
            <View style={styles.timePickerColumn}>
              <Text style={styles.timePickerLabel}>Hour</Text>
              <View style={styles.timePickerListContainer}>
                <ScrollView
                  ref={hourRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onScroll={handleHourScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                >
                  {hours.map((h) => (
                    <View key={`h-${h}`}>{renderItem(h, h === selectedHour)}</View>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.timePickerColumn}>
              <Text style={styles.timePickerLabel}>Minute</Text>
              <View style={styles.timePickerListContainer}>
                <ScrollView
                  ref={minuteRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onScroll={handleMinuteScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                >
                  {minutes.map((m) => (
                    <View key={`m-${m}`}>{renderItem(m, m === selectedMinute)}</View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function EditDevice() {
  const router = useRouter();
  const { deviceId, categoryId, title, iconType, mode } = useLocalSearchParams();
  const { addDevice, updateDevice, getDeviceById } = useUsage();

  const [watt, setWatt] = useState('');
  const [timeStr, setTimeStr] = useState('0 hr 00 min');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && deviceId) {
      const existing = getDeviceById(deviceId);
      if (existing) {
                setWatt(String(existing.watt || '').replace(/\D/g, ''));
        setTimeStr(existing.time || '0 hr 00 min');
      }
    }
  }, [mode, deviceId, getDeviceById]);

  const parseTime = (str) => {
    const hr = str.match(/(\d+)\s*hr/);
    const min = str.match(/(\d+)\s*min/);
    return {
      h: hr ? parseInt(hr[1], 10) : 0,
      m: min ? parseInt(min[1], 10) : 0,
    };
  };
  const { h: initialHour, m: initialMinute } = parseTime(timeStr);

  const handleTimeDone = (h, m) => {
    setTimeStr(`${h} hr ${String(m).padStart(2, '0')} min`);
    setShowPicker(false);
  };

  const handleSave = async () => {
    const wattValue = watt.trim() === '' ? '0' : watt.trim();
    const payload = {
      name: title,
      watt: `${wattValue} Watt`,
      time: timeStr,
    };

    if (mode === 'edit' && deviceId) {
      await updateDevice(deviceId, payload);
    } else {
      await addDevice({ categoryId, ...payload });
    }
    router.back();
  };

  const renderIcon = () => {
    const src = ICON_MAP[iconType];
    if (src) return <Image source={src} style={styles.editIcon} />;
    return <View style={[styles.editIcon, { backgroundColor: '#E5E7EB', borderRadius: 20 }]} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'edit' ? 'Edit Device' : 'Add Device'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.form}>
        {renderIcon()}
        <Text style={styles.deviceName}>{title}</Text>

        <Text style={styles.label}>Wattage</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={watt}
          onChangeText={setWatt}
          placeholder="e.g. 700"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Daily Usage Time</Text>
        <TouchableOpacity style={styles.timeField} onPress={() => setShowPicker(true)}>
          <Text style={styles.timeFieldText}>{timeStr}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {mode === 'edit' ? 'Update Device' : 'Save Device'}
          </Text>
        </TouchableOpacity>
      </View>

      <TimePickerModal
        visible={showPicker}
        onCancel={() => setShowPicker(false)}
        onDone={handleTimeDone}
        initialHour={initialHour}
        initialMinute={initialMinute}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  form: { padding: 24, alignItems: 'center' },
  editIcon: { width: 64, height: 64, resizeMode: 'contain', marginBottom: 12 },
  deviceName: { fontSize: 18, fontWeight: '700', color: '#0D2A4A', marginBottom: 24 },

  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', marginBottom: 18,
  },
  timeField: {
    width: '100%', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 28,
  },
  timeFieldText: { fontSize: 16, color: '#111827', fontWeight: '500' },

  saveButton: {
    width: '100%', backgroundColor: '#1958CE', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  timePickerWrapper: {
    width: '85%', backgroundColor: '#FFF', borderRadius: 16,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  timePickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  timePickerCancel: { fontSize: 16, color: '#6B7280' },
  timePickerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  timePickerDone: { fontSize: 16, color: '#1958CE', fontWeight: '600' },

  timePickerBody: {
    flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, height: PICKER_HEIGHT + 40,
  },
  timePickerColumn: { flex: 1, alignItems: 'center' },
  timePickerLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  timePickerListContainer: {
    height: PICKER_HEIGHT, width: '100%', overflow: 'hidden',
  },

  timeItem: {
    height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center',
  },
  timeItemActive: {
    backgroundColor: '#DBEAFE', borderRadius: 8, marginHorizontal: 16,
  },
  timeItemText: { fontSize: 20, color: '#9CA3AF' },
  timeItemTextActive: { color: '#1958CE', fontWeight: '700' },
});