import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import React, { useMemo } from 'react';
import Svg, { Circle, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUsage } from '../Usage/UsageContext';

const CHART_HEIGHT = 240;
const LABEL_HEIGHT = 40;
const PLOT_HEIGHT = CHART_HEIGHT - LABEL_HEIGHT;

// Y-axis: 0% at bottom → 100% at top, 20% intervals
const Y_TICKS = [100, 80, 60, 40, 20, 0];

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const {
    monthlyBudget,
    monthlyEstimate,
    isReady,
    getForecast,
  } = useUsage();

  /* ═══════════════════════════════════════
     BUDGET NUMBERS
  ═══════════════════════════════════════ */

  const forecast = getForecast();

  const estimatedCost = forecast.estimatedCost;
  const apiBudget = monthlyEstimate?.monthlyBudget ?? monthlyBudget;

  const localPercent = apiBudget > 0
    ? Math.round((estimatedCost / apiBudget) * 100)
    : 0;

  const displayPercentage = Math.min(localPercent, 100);
  const isOverBudget = estimatedCost > apiBudget;

  const remaining = Math.max(apiBudget - estimatedCost, 0);

  /* ═══════════════════════════════════════
     CONSUMPTION BREAKDOWN
  ═══════════════════════════════════════ */

  const breakdown = useMemo(() => {
    const items = monthlyEstimate?.applianceConsumptionBreakdown;

    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item, index) => ({
        id: `${item.name}-${index}`,
        name: item.name,
        monthlyUnits: Number(item.monthlyKwh) || 0,
        percentage: Number(item.percentage) || 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [monthlyEstimate]);

  /* Chart uses the same percentage as the Bottom Card */
  const chartData = breakdown;

  /* ═══════════════════════════════════════
     CIRCULAR PROGRESS
  ═══════════════════════════════════════ */

  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (c * displayPercentage) / 100;
  const ringColor = isOverBudget ? '#EF4444' : '#22C55E';

  /* ═══════════════════════════════════════
     LOADING
  ═══════════════════════════════════════ */

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ═══════════════════════════════════════
     UI
  ═══════════════════════════════════════ */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════
            TOP CARD
        ═══════════════════════════════ */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Monthly Budget Progress
          </Text>

          <View style={styles.circleWrap}>
            <Svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
            >
              <G
                rotation="-90"
                originX={size / 2}
                originY={size / 2}
              >
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke="#E5E7EB"
                  strokeWidth={stroke}
                  fill="none"
                />
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={ringColor}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </G>
            </Svg>

            <View style={styles.circleText}>
              <Text style={styles.percentText}>
                {displayPercentage}%
              </Text>
              <Text style={styles.percentSub}>
                of budget used
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.status,
              { color: isOverBudget ? '#DC2626' : '#059669' },
            ]}
          >
            {isOverBudget
              ? 'You have exceeded your budget.'
              : "Great job! You're within your budget."}
          </Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Estimated Bill</Text>
              <Text style={styles.rowSub}>This month</Text>
            </View>
            <Text style={styles.rowValue}>
              {estimatedCost.toLocaleString()} MMK
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Budget</Text>
              <Text style={styles.rowSub}>Monthly budget</Text>
            </View>
            <Text style={styles.rowValue}>
              {apiBudget.toLocaleString()} MMK
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Remaining</Text>
              <Text style={styles.rowSub}>Left to spend</Text>
            </View>
            <Text
              style={[
                styles.rowValue,
                { color: remaining <= 0 ? '#DC2626' : '#111827' },
              ]}
            >
              {remaining.toLocaleString()} MMK
            </Text>
          </View>
        </View>

        {/* ═══════════════════════════════
            BAR CHART CARD
        ═══════════════════════════════ */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Consumption by Device
          </Text>

          {chartData.length === 0 ? (
            <Text style={styles.empty}>
              No usage data yet. Add devices to see the chart.
            </Text>
          ) : (
            <View style={styles.chartContainer}>
              {/* Y AXIS */}
              <View style={styles.yAxis}>
                {Y_TICKS.map((tick) => (
                  <View
                    key={tick}
                    style={[
                      styles.yTickRow,
                      { bottom: `${tick}%` },
                    ]}
                  >
                    <Text style={styles.yTickText}>
                      {tick}%
                    </Text>
                    <View style={styles.yTickLine} />
                  </View>
                ))}
              </View>

              {/* CHART AREA */}
              <View style={styles.barsArea}>
                {/* GRID LINES */}
                <View style={styles.gridLines} pointerEvents="none">
                  {Y_TICKS.map((tick) => (
                    <View
                      key={tick}
                      style={[
                        styles.gridLine,
                        { bottom: `${tick}%` },
                      ]}
                    />
                  ))}
                </View>

                {/* BARS */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.barsScrollContent}
                >
                  {chartData.map((item) => {
                    const percentage = Number(item.percentage) || 0;

                    return (
                      <View key={item.id} style={styles.barColumn}>
                        {/* Plot area */}
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.min(percentage, 100)}%`,
                              },
                            ]}
                          />

                          {/* Percentage label on top of bar */}
                          <Text
                            style={[
                              styles.barPercentage,
                              {
                                bottom:
                                  percentage === 0
                                    ? 2
                                    : `${Math.min(percentage, 100)}%`,
                              },
                            ]}
                          >
                            {percentage}%
                          </Text>
                        </View>

                        {/* Device label */}
                        <Text style={styles.barLabel} numberOfLines={2}>
                          {item.name}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
        </View>

       

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Estimated Monthly Consumption
          </Text>

          {breakdown.length === 0 && (
            <Text style={styles.empty}>
              No usage data yet. Add devices to see breakdown.
            </Text>
          )}

          {breakdown.map((item) => (
            <View key={item.id} style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownName}>{item.name}</Text>
                <Text style={styles.breakdownPercent}>
                  {item.percentage}%
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(item.percentage, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  scroll: {
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ─── CARD ─── */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  empty: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginVertical: 12,
  },

  /* ─── CIRCULAR PROGRESS ─── */
  circleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  circleText: {
    position: 'absolute',
    alignItems: 'center',
  },

  percentText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  percentSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  status: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },

  /* ─── INFO ROWS ─── */
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  rowSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  rowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  

  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
    marginTop: 8,
  },

 
  yAxis: {
    width: 44,
    height: PLOT_HEIGHT,
    position: 'relative',
  },

 
  yTickRow: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    transform: [{ translateY: '-50%' }],
  },

  yTickText: {
    fontSize: 10,
    color: '#9CA3AF',
    width: 30,
    textAlign: 'right',
    marginRight: 4,
    lineHeight: 12,
  },

  yTickLine: {
    width: 4,
    height: 1,
    backgroundColor: '#D1D5DB',
  },

  
  barsArea: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
    marginLeft: 4,
  },

 
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PLOT_HEIGHT,
  },

  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  
  barsScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },

  
  barColumn: {
    alignItems: 'center',
    width: 64,
    height: CHART_HEIGHT,
    marginHorizontal: 6,
  },

  
  barTrack: {
    width: 32,
    height: PLOT_HEIGHT,
    justifyContent: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },

  
  barFill: {
    width: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 6,
  },

  
  barPercentage: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: '#374151',
    paddingBottom: 2,
  },

  barLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    width: 64,
    lineHeight: 14,
  },


  breakdownItem: {
    marginBottom: 14,
  },

  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  breakdownName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  breakdownPercent: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },

  track: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    backgroundColor: '#2167E1',
    borderRadius: 4,
  },
});
