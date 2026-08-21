import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useUsage } from './Usage/UsageContext';
import { formatCost, formatUnits, summarizeUsageBill } from './utils/billing';
import { useLanguage } from './context/LanguageContext';

// ===== COMPONENT =====
export default function UsageDetail({ visible, onClose, type = 'current' }) {
  const { getUsage } = useUsage();
  const { t } = useLanguage();
  const {
    allItems,
    totalDailyUnits,
    totalMonthlyUnits,
    totalDailyCost,
    totalMonthlyCost,
  } = summarizeUsageBill(getUsage);

  const isCurrent = type === 'current';
  const displayItems = allItems.map(item => ({
    ...item,
    units: isCurrent ? item.dailyUnits : item.monthlyUnits,
    cost: isCurrent ? item.dailyCost : item.monthlyCost,
  }));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <AntDesign name="close" size={20} color="#333" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>{t('averageTotalConsumption')}</Text>

          {/* Table Header */}
          <View style={styles.tableRow}>
            <Text style={[styles.headerCell, { flex: 1.5 }]}>{t('devices')}</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>{t('units')}</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>{t('cost')}</Text>
          </View>

          <View style={styles.divider} />

          {/* Scrollable List */}
          <ScrollView style={styles.scrollArea}>
            {displayItems.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.deviceCell, { flex: 1.5 }]}>{item.name}({item.watt})</Text>
                <Text style={[styles.unitCell, { flex: 1 }]}>{formatUnits(item.units)} {t('units')}</Text>
                <Text style={[styles.costCell, { flex: 1 }]}>{formatCost(item.cost)} MMK</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          {/* Summary */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('currentUsage')}</Text>
           <Text style={styles.summaryUnits}>{formatUnits(totalDailyUnits)} {t('units')}</Text>
            <Text style={styles.summaryCost}>{formatCost(totalDailyCost)} MMK</Text>

          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('estimatedTotal')}</Text>
            <Text style={styles.summaryUnits}>{formatUnits(totalMonthlyUnits)} {t('units')}</Text>
            <Text style={styles.summaryCost}>{formatCost(totalMonthlyCost)} MMK</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ===== STYLES =====

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
   
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
     borderColor:'#1658C3',
    borderWidth:3
    
  },
  closeBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#f0f0f0',
    padding: 6,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  deviceCell: {
    fontSize: 14,
    color: '#333',
  },
  unitCell: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  costCell: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 5,
  },
  scrollArea: {
    maxHeight: 300,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
  },
  summaryLabel: {
    flex: 1.5,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
  summaryUnits: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
  summaryCost: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    color: '#333',
    fontWeight: '600',
  },
});
