import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUsage } from './UsageContext';

const UsageTrackerComponent = ({ category, data }) => {
  const router = useRouter();
  const usageContext = useUsage();
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(() => data?.items?.[0] || null);

  const dropdownItems = [
    ...data.items,
    { name: "Custom", watt: "Custom" },
  ];

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Category not found: {category}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { addUsage, removeUsage, getUsage } = usageContext || {};

  const [showPicker, setShowPicker] = useState(false);
  const [activeItemName, setActiveItemName] = useState('');
  const [tempHour, setTempHour] = useState(8);
  const [tempMinute, setTempMinute] = useState(0);
  const [selectedTimes, setSelectedTimes] = useState({});
  const [customWatt, setCustomWatt] = useState('');

  // Read directly from global context — no local pending state needed
  const currentUsage = getUsage(category) || [];

  const handleOpenPicker = (name) => {
    setActiveItemName(name);
    const currentTime = selectedTimes[name] || "8 hr 00 min";
    const hour = parseInt(currentTime.split("hr")[0].trim()) || 8;
    const minute = parseInt(currentTime.split("hr")[1].replace("min", "").trim()) || 0;
    setTempHour(hour);
    setTempMinute(minute);
    setShowPicker(true);
  };

  const handleConfirmTime = () => {
    const newTime = `${tempHour} hr ${tempMinute.toString().padStart(2, '0')} min`;
    setSelectedTimes(prev => ({ ...prev, [activeItemName]: newTime }));
    setShowPicker(false);
  };

 const submitToUsage = async (item) => {
    const timeDisplay = selectedTimes[item.name] || "8 hr 00 min";

    if (item.name === "Custom" && !customWatt) {
      Alert.alert("Please enter watt value");
      return;
    }

    const finalWatt = item.name === 'Custom' ? `${customWatt}W` : item.watt;

    const newItem = {
      id: Date.now().toString(),
      name: item.name,
      watt: finalWatt,
      time: timeDisplay,
    };

    try {
      await addUsage(category, newItem);

      if (item.name === 'Custom') {
        setCustomWatt('');
      }
    } catch (error) {
      Alert.alert(
        'Unable to save appliance',
        'Please check your internet connection and try again.'
      );
    }
  };

  const handleDelete = (itemId) => {
    removeUsage(category, itemId);
  };

  const handleCustomFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <Text style={styles.sectionTitle}>{data.title} - Add Usage Details</Text>

            <View style={{ position: 'relative' }}>
              <View style={styles.card}>
                <Text style={styles.inputLabel}>Select Appliance</Text>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowDropdown(!showDropdown)}
                  >
                    <Text style={styles.cardTitle}>
                      {selectedItem.watt} ({selectedItem.name})
                    </Text>
                    <Ionicons
                      name={showDropdown ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="white"
                    />
                  </TouchableOpacity>

                  {selectedItem.name === "Custom" && (
                    <TextInput
                      ref={inputRef}
                      style={styles.inputBox}
                      placeholder="Enter watt (W)"
                      keyboardType="numeric"
                      value={customWatt}
                      onChangeText={setCustomWatt}
                      onFocus={handleCustomFocus}
                    />
                  )}
                </View>

                <Text style={styles.inputLabel}>Daily Usage Time</Text>

                <TouchableOpacity
                  style={styles.timePicker}
                  onPress={() => handleOpenPicker(selectedItem.name)}
                >
                  <Text style={styles.timeText}>
                    {selectedTimes[selectedItem?.name] || "8 hr 00 min"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="white" />
                </TouchableOpacity>

                <View style={{ alignItems: 'flex-end', width: '100%' }}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => submitToUsage(selectedItem)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="white" />
                    <Text style={styles.addButtonText}>Add Appliance</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Modal
                visible={showDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDropdown(false)}
              >
                <TouchableOpacity
                  style={styles.dropdownOverlay}
                  activeOpacity={1}
                  onPress={() => setShowDropdown(false)}
                >
                  <View style={styles.dropdownMenu}>
                    {dropdownItems.map((item, index) => (
                      <TouchableOpacity
                        key={`${item.name}-${item.watt}-${index}`}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedItem(item);
                          setShowDropdown(false);
                          if (item.name === "Custom") {
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }
                        }}
                      >
                        <Text style={styles.dropdownText}>
                          {item.watt} ({item.name})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            <Text style={styles.sectionTitle}>Current Usage</Text>
          </View>

          <FlatList
            data={currentUsage}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.usageCard}>
                <View style={styles.usageTopRow}>
                  <Text style={styles.usageTextBold} numberOfLines={1}>
                    {item.watt}   {item.time}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.usageTextLight}>{item.name}</Text>
              </View>
            )}
            scrollEnabled={false}
          />
        </ScrollView>
      </KeyboardAvoidingView>

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
  data={Array.from({ length: 25 }, (_, i) => i)}
  keyExtractor={(item) => `h-${item}`}
  renderItem={({ item }) => (
    <View
      style={[
        styles.wheelItem,
        tempHour === item && styles.wheelItemActive
      ]}
    >
      <Text
        style={[
          styles.wheelItemText,
          tempHour === item && styles.wheelItemTextActive
        ]}
      >
        {item}
      </Text>
    </View>
  )}
  showsVerticalScrollIndicator={false}
  snapToInterval={40}
  decelerationRate="fast"
  scrollEventThrottle={16}
  getItemLayout={(_, index) => ({
    length: 40,
    offset: 40 * index,
    index
  })}
  initialScrollIndex={tempHour}
  onMomentumScrollEnd={(e) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.y / 40
    );

    if (index >= 0 && index < 25) {
      setTempHour(index);
    }
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
                    data={Array.from({ length: 12 }, (_, i) => i * 5)}
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
                    initialScrollIndex={Math.round(tempMinute / 5)}
                    onMomentumScrollEnd={(e) => {
                      const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                      if (index >= 0 && index < 12) setTempMinute(index * 5);
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
};

export default UsageTrackerComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 3,
    backgroundColor: '#f0f4f8'
  },
  backButton: {
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  headerContainer: {
    paddingHorizontal: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
    color: '#333'
  },
  card: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: 10,
  },
  cardTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#5c7cfa',
    padding: 12,
    borderRadius: 8,
  },
  dropdownMenu: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
  },
  dropdownOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dropdownText: {
    color: '#1e293b',
    fontSize: 13,
  },
  inputBox: {
    backgroundColor: "white",
    width: "100%",
    height: 40,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#4263eb",
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4263eb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    color: 'white'
  },
  plus: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 20
  },
  usageCard: {
    backgroundColor: '#5c7cfa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    width: '47%'
  },
  usageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    width: '100%',
  },
  usageTextBold: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 9,
    marginRight: 6,
  },
  usageTextLight: {
    color: '#e0e0e0',
    fontSize: 11
  },
  closeBtn: {
    color: '#fff',
    fontSize: 16,
    width: 18,
    height: 26,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputLabel: {
    color: '#4161e1',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4263eb',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 15,
    alignSelf: 'flex-end',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 100,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pickerCancelBtn: {
    color: '#666',
    fontSize: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  pickerDoneBtn: {
    color: '#4263eb',
    fontSize: 16,
    fontWeight: '600',
  },
  wheelsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: 200,
    paddingVertical: 10,
  },
  wheelColumn: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  wheelLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  wheelWrapper: {
    height: 200,
    width: 80,
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(66, 99, 235, 0.1)',
    borderRadius: 8,
  },
  wheelItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  wheelItemText: {
    fontSize: 18,
    color: '#999',
  },
  wheelItemTextActive: {
    color: '#4263eb',
    fontWeight: 'bold',
    fontSize: 20,
  },
});
