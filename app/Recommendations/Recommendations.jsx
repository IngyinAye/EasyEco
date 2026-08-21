import {
  StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
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
  refrigerator: 'fridge',
  ac: 'ac',
  washing: 'washing',
  bulb: 'bulb',
  fan: 'fan',
  tv: 'tv',
  iron: 'iron',
  microwave: 'microwave',
  rice: 'rice',
  pot: 'pot',
  kettle: 'kettle',
  vacuum: 'vacuum',
};

const BackIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function Recommendations() {
  const router = useRouter();
  // ✅ FIX: get getUsage from context
  const {
    devices,
    recommendations,
    fetchRecommendations,
    isLoading,
  } = useUsage();

  useEffect(() => {
    fetchRecommendations().catch(() => undefined);
  }, [fetchRecommendations]);

  const isOverBudget = recommendations?.isOverBudget ?? false;
  const overBudgetAmount = recommendations?.overBudgetAmount ?? 0;
  const formatReductionTime = (minutes) => {
    const totalMinutes = Math.max(Math.round(Number(minutes) || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return `${hours} hr ${remainingMinutes} min/day`;
    }

    if (hours > 0) return `${hours} hr/day`;
    return `${remainingMinutes} min/day`;
  };

  const recommendationItems = (recommendations?.recommendations || []).map((item) => ({
    ...item,
    id: item.applianceId,
    category: item.category || devices.find((device) => device.id === item.applianceId)?.categoryId,
    recommendation: `Reduce ${item.name} usage by ${formatReductionTime(item.reducedMinutesPerDay)}.`,
  }));

  const renderIcon = (type) => {
    const src = ICON_MAP[type];
    if (src) return <Image source={src} style={styles.icon} />;
    return (
      <View style={styles.fallbackIcon}>
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
        <Text style={styles.headerTitle}>Recommendations</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Loading recommendations…</Text>
          </View>
        )}

        {isOverBudget && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              You are <Text style={styles.bannerAmount}>{overBudgetAmount.toLocaleString()} MMK</Text> over budget.
            </Text>
            <Text style={styles.bannerSub}>Follow these tips to save money:</Text>
          </View>
        )}

        {!isOverBudget && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You are within budget. No recommendations needed.</Text>
          </View>
        )}

        {recommendationItems.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              {renderIcon(CATEGORY_ICON_MAP[item.category] || item.iconType || 'bulb')}
              <Text style={styles.cardTitle}>{item.name}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardBody}>
              {item.recommendation}
            </Text>
            <Text style={styles.cardSave}>
              Save <Text style={styles.saveAmount}>- {item.savings.toLocaleString()} MMK</Text> / month
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerBtn: { padding: 4, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1958CE' },

  list: { padding: 16, paddingBottom: 40 },
  banner: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  bannerText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  bannerAmount: { color: '#DC2626', fontWeight: 'bold' },
  bannerSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },

  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  icon: { width: 32, height: 32, resizeMode: 'contain', marginRight: 12 },
  fallbackIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 10 },
  cardBody: { fontSize: 13, color: '#4B5563', marginBottom: 6, lineHeight: 18 },
  cardSave: { fontSize: 13, color: '#374151', fontWeight: '500' },
  saveAmount: { color: '#059669', fontWeight: '700' },
});
