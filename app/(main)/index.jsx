import {
  Alert, StyleSheet, Text, View, TouchableOpacity, Image,
  ScrollView, Modal, TextInput, Pressable, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUsage } from '../Usage/UsageContext';
import {
  generateRecommendation,
  formatUnits,
  formatCost,
  summarizeUsageBill,
} from '../utils/billing';
import { useLanguage } from '../context/LanguageContext';
import UsageDetail from '../UsageDetail';

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

const PAGES_DATA = [
  [
    { id: 1, title: 'Refrigerator', iconType: 'fridge', categoryId: 'refrigerator' },
    { id: 2, title: 'Air Conditioner', iconType: 'ac', categoryId: 'ac' },
    { id: 3, title: 'Washing Machine', iconType: 'washing', categoryId: 'washing' },
    { id: 4, title: 'Electric bulb', iconType: 'bulb', categoryId: 'bulb' },
  ],
  [
    { id: 5, title: 'Electric Fan', iconType: 'fan', categoryId: 'fan' },
    { id: 6, title: 'Television', iconType: 'tv', categoryId: 'tv' },
    { id: 7, title: 'Electric Iron', iconType: 'iron', categoryId: 'iron' },
    { id: 8, title: 'Microwave Oven', iconType: 'microwave', categoryId: 'microwave' },
  ],
  [
    { id: 9, title: 'Rice Cooker', iconType: 'rice', categoryId: 'rice' },
    { id: 10, title: 'Cooking Pot', iconType: 'pot', categoryId: 'pot' },
    { id: 11, title: 'Electric Kettle', iconType: 'kettle', categoryId: 'kettle' },
    { id: 12, title: 'Vacuum Cleaner', iconType: 'vacuum', categoryId: 'vacuum' },
  ]
];

export default function Calculate() {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = (screenWidth - 60) / 2;
  const cardHeight = Math.max(150, Math.min(screenHeight * 0.21, 220));
  const {
    devices, monthlyBudget, dailyRecords,
    getUsage, getForecast, saveDailyRecord, saveMonthlyBudget,
    saveConfiguration, hasCalculatedBill, isReady, markBillCalculated,
  } = useUsage();
  const { t } = useLanguage();
  const billSummary = useMemo(() => summarizeUsageBill(getUsage), [getUsage]);
  const billIsAvailable = isReady && hasCalculatedBill;

  const [activePage, setActivePage] = useState(0);
  const scrollViewRef = useRef(null);
  const [usageModalVisible, setUsageModalVisible] = useState(false);

  const [currentUnits, setCurrentUnits] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [estimatedUnits, setEstimatedUnits] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);

  const [recommendationText, setRecommendationText] = useState('');
  const [budgetStatus, setBudgetStatus] = useState({
    isOverBudget: false, overBudgetAmount: 0, alertMessage: '', alertType: 'success'
  });

  const handleOpenUsageModal = () => setUsageModalVisible(true);
  const handleCloseUsageModal = () => setUsageModalVisible(false);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget));

  useEffect(() => {
    setRecommendationText(devices.length > 0 ? generateRecommendation(devices) : '');
  }, [devices]);

  // ✅ FIX: pass getUsage instead of devices
     const runForecast = useCallback((shouldSaveToday = false, estimate, configuredDevices = devices) => {
    const forecast = getForecast(estimate, configuredDevices);

    setCurrentUnits(forecast.currentDailyUnits);
    setCurrentCost(forecast.currentDailyCost);
    setEstimatedUnits(forecast.estimatedUnits);
    setEstimatedCost(forecast.estimatedCost);

    setBudgetStatus({
      isOverBudget: forecast.isOverBudget,
      overBudgetAmount: forecast.overBudgetAmount,
      alertMessage: forecast.isOverBudget
        ? `You are ${formatCost(forecast.overBudgetAmount)} MMK over your budget.`
        : 'You are within the budget.',
      alertType: forecast.isOverBudget ? 'warning' : 'success',
    });

    setRecommendationText(generateRecommendation(devices));

  if (shouldSaveToday) {
      saveDailyRecord(forecast.currentDailyUnits, forecast.currentDailyCost);
    }
  }, [getForecast, devices, saveDailyRecord]);

  const handleCalculatePress = async () => {
    try {
      const estimate = await saveConfiguration(devices);
      runForecast(false, estimate, devices);
      markBillCalculated();
      setResultModalVisible(true);
    } catch (error) {
      Alert.alert(
        'Could not calculate bill',
        error.response?.data?.message || 'Please check your connection and try again.'
      );
    }
  };

  const handleOpenBudgetModal = () => {
    setBudgetInput(String(monthlyBudget));
    setBudgetModalVisible(true);
  };

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetInput);
    if (Number.isNaN(val) || val < 0) {
      Alert.alert('Invalid budget', 'Enter a non-negative budget amount.');
      return;
    }

    try {
      await saveMonthlyBudget(val);
      setBudgetModalVisible(false);
    } catch (error) {
      Alert.alert(
        'Could not save budget',
        error.response?.data?.message || error.message || 'Please try again.'
      );
    }
  };

  const handleDotPress = (pageIndex) => {
    setActivePage(pageIndex);
    scrollViewRef.current?.scrollTo({ x: pageIndex * (screenWidth - 40), animated: true });
  };

  const handleScroll = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (screenWidth - 40));
    if (idx !== activePage && idx >= 0 && idx < PAGES_DATA.length) setActivePage(idx);
  };

  const renderFigmaIcon = (type) => {
    const src = ICON_MAP[type];
    if (src) return <Image source={src} style={{ width: 24, height: 24 }} />;
    return (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path d="M12 3V21M3 12H21" stroke="#1958CE" strokeWidth="2" />
      </Svg>
    );
  };

  const handleCardPress = (item) => {
    router.push({
      pathname: '../Usage/[category]',
      params: { category: item.categoryId },
    });
  };

  const renderCardContent = (item) => {
    const specs = getUsage(item.categoryId);
    if (!specs || specs.length === 0) {
      return <Text style={styles.addActionText}>{t('addUsageDetails')}</Text>;
    }
    return (
      <View style={styles.specsContainer}>
        {specs.slice(0, 2).map((spec, i) => (
          <View key={i} style={styles.specRow}>
            <Text style={styles.specText}>{spec.watt}</Text>
            <Text style={styles.specText}>{spec.time}</Text>
          </View>
        ))}
        {specs.length > 2 && <Text style={styles.moreText}>...</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.container}>
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={[styles.mainContentContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.mainTitle}>{t('estimatedMonthlyBill')}</Text>

        <TouchableOpacity activeOpacity={0.9} onPress={handleOpenUsageModal}>
          <View style={styles.billCard}>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetText}>Monthly Budget Goal : {monthlyBudget} MMK</Text>
              <TouchableOpacity style={styles.setBudgetButton} onPress={handleOpenBudgetModal}>
                <Text style={styles.setBudgetText}>✎ SET BUDGET</Text>
              </TouchableOpacity>

              <UsageDetail
                visible={usageModalVisible}
                onClose={handleCloseUsageModal}
                type="current"
                currentUnits={billIsAvailable ? billSummary.totalDailyUnits : 0}
                currentCost={billIsAvailable ? billSummary.totalDailyCost : 0}
                estimatedUnits={billIsAvailable ? billSummary.totalMonthlyUnits : 0}
              />
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]} />
              <Text style={styles.tableHeaderText}>{t('energyUsage')}</Text>
              <Text style={styles.tableHeaderText}>{t('electricityBill')}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.rowLabel, { flex: 1.2 }]}>{t('currentUsage')}</Text>
              <Text style={styles.rowValue}>{isReady ? `${formatUnits(billIsAvailable ? billSummary.totalDailyUnits : 0)} ${t('units')}` : 'Loading...'}</Text>
              <Text style={styles.rowValue}>{isReady ? `${formatCost(billIsAvailable ? billSummary.totalDailyCost : 0)} MMK` : 'Loading...'}</Text>
            </View>
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.rowLabel, { flex: 1.2 }]}>{t('estimatedTotal')}</Text>
              <Text style={styles.rowValue}>{isReady ? `${formatUnits(billIsAvailable ? billSummary.totalMonthlyUnits : 0)} ${t('units')}` : 'Loading...'}</Text>
              <Text style={styles.rowValue}>{isReady ? `${formatCost(billIsAvailable ? billSummary.totalMonthlyCost : 0)} MMK` : 'Loading...'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity  onPress={() => router.push({ pathname: '../Recommendations/Recommendations' })}>
          <View style={styles.recommendationBanner}>
            <Text style={styles.recommendationText} numberOfLines={1}>
              <Text style={styles.recommendationBold}>Recommendations &gt;&gt; </Text>
              {recommendationText}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('trackDurationWattage')}</Text>
          <TouchableOpacity
            style={styles.myDevicesButton}
            onPress={() => router.push({ pathname: '../Devices/MyDevices' })}
          >
            <Text style={styles.myDevicesText}>☰ My Devices</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.swiperWrapper}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ flexGrow: 1 }}
            nestedScrollEnabled
          >
            {PAGES_DATA.map((pageItems, pageIndex) => (
              <View key={pageIndex} style={[styles.pageContainer, { width: screenWidth - 40 }]}>
                <View style={styles.gridContainer}>
                  {pageItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.applianceCard, { width: cardWidth, height: cardHeight }]}
                      onPress={() => handleCardPress(item)}
                    >
                      <View>
                        <View style={styles.iconCircle}>{renderFigmaIcon(item.iconType)}</View>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.underline} />
                      </View>
                      {renderCardContent(item)}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.paginationContainer}>
          {PAGES_DATA.map((_, index) => (
            <View key={index} style={[styles.dot, activePage === index ? styles.activeDot : styles.inactiveDot]} />
          ))}
        </View>

        <TouchableOpacity style={styles.calculateButton} onPress={handleCalculatePress}>
          <Text style={styles.buttonText}>{t('calculateBill')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal animationType="fade" transparent visible={resultModalVisible}>
        <View style={styles.resultModalOverlay}>
          <Pressable style={styles.resultModalBackdrop} onPress={() => setResultModalVisible(false)} />
          <View style={styles.resultModalCard}>
            <View style={styles.alertRow}>
              <Text style={styles.alertIcon}>
                {budgetStatus.alertType === 'warning' ? '⚠️' : '✅'}
              </Text>
              <Text style={styles.alertText}>
                {budgetStatus.alertType === 'warning' ? (
                  <>
                    You are <Text style={styles.alertAmountOver}>{formatCost(budgetStatus.overBudgetAmount)}</Text> MMK over your budget.
                  </>
                ) : (
                  <Text style={styles.alertAmountSafe}>You are within the budget.</Text>
                )}
              </Text>
            </View>
            {budgetStatus.isOverBudget && (
              <TouchableOpacity style={styles.viewRecLink} onPress={() => {
                setResultModalVisible(false);
                router.push({ pathname: '../Recommendations/Recommendations' });
              }}>
                <Text style={styles.viewRecText}>View Recommendations →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={budgetModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Monthly Budget Goal</Text>

            <Text style={styles.modalLabel}>Monthly Budget</Text>
            <View style={styles.modalInputWrapper}>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={budgetInput}
                onChangeText={setBudgetInput}
                placeholder="Enter amount (e.g. 50,000)"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.modalInputSuffix}>MMK</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setBudgetModalVisible(false)}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonSave} onPress={handleSaveBudget}>
                <Text style={styles.modalButtonTextSave}>Save Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  mainContent: { flex: 1 },
  mainContentContent: { paddingHorizontal: 20, paddingTop: 10 },
  mainTitle: { fontSize: 20, fontWeight: 'bold', color: '#0D2A4A', marginBottom: 9 },
  billCard: {
    backgroundColor: '#2167E1',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  budgetText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  setBudgetButton: {
    backgroundColor: '#0D2A4A',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  setBudgetText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tableHeader: { flexDirection: 'row', marginBottom: 4 },
  tableHeaderText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 4,
    marginBottom: 4,
  },
  rowLabel: { color: '#FFF', fontSize: 12 },
  rowValue: {
    flex: 1,
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  recommendationBanner: {
    backgroundColor: '#0D2A4A',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    width: '100%',
  },
  recommendationText: { color: '#FFF', fontSize: 12 },
  recommendationBold: { fontWeight: 'bold', color: '#FFF' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0D2A4A' },
  myDevicesButton: {
    backgroundColor: '#2167E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  myDevicesText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  swiperWrapper: { width: '100%' },
  pageContainer: {},
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  applianceCard: {
    backgroundColor: '#3B7AEE',
    borderRadius: 16,
    padding: 12,
    marginBottom: 7,
  },
  iconCircle: {
    width: 36,
    height: 36,
    backgroundColor: '#FFF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  underline: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dot: { height: 4, borderRadius: 3, marginHorizontal: 4 },
  activeDot: { width: 24, backgroundColor: '#A2B9E3' },
  inactiveDot: { width: 10, backgroundColor: '#D4E0F7' },
  calculateButton: {
    backgroundColor: '#1958CE',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: 'center',
    width: '55%',
  },
  specsContainer: { width: '100%', marginTop: 5 },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 2,
    gap: 8,
  },
  specText: { fontSize: 11, color: '#FFF', fontWeight: '400' },
  moreText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  addActionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingVertical: 4,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  resultModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  resultModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  resultModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: { fontSize: 18, marginRight: 8 },
  alertText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 1,
  },
  alertAmountOver: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 15,
  },
  alertAmountSafe: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 14,
  },
  viewRecLink: { marginTop: 12 },
  viewRecText: { color: '#1958CE', fontWeight: '600', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  modalLabel: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 6,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  modalInputSuffix: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1958CE',
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  modalButtonTextSave: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
