const TARIFF_TIERS = [
  { limit: 50, rate: 50 },
  { limit: 50, rate: 100 },
  { limit: 100, rate: 150 },
  { limit: Infinity, rate: 300 },
];

const round = (value, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
};

function calculateApplianceDailyUnits(appliance = {}) {
  const watt = Math.max(Number(appliance.watt) || 0, 0);
  const quantity = Math.max(Number(appliance.quantity) || 0, 0);
  const minutesPerDay = Math.max(Number(appliance.minutesPerDay) || 0, 0);
  const dutyCyclePercent = Math.max(Number(appliance.dutyCyclePercent ?? 100) || 0, 0);

  return (watt * quantity * (minutesPerDay / 60) * (dutyCyclePercent / 100)) / 1000;
}

function buildDailyBreakdown(appliances = []) {
  const items = appliances.map((appliance) => ({
    applianceId: appliance.applianceId,
    category: appliance.category,
    name: appliance.name,
    dailyUnits: calculateApplianceDailyUnits(appliance),
  }));

  const totalDailyUnits = items.reduce((sum, item) => sum + item.dailyUnits, 0);

  return {
    totalDailyUnits,
    items: items.map((item) => ({
      ...item,
      percentage: totalDailyUnits > 0 ? (item.dailyUnits / totalDailyUnits) * 100 : 0,
    })),
  };
}

function calculateTieredBill(totalUnits) {
  // YESC's calculator bills the displayed whole-unit consumption. Keep the
  // rate calculation aligned with the unit shown in the mobile application.
  let remaining = Math.round(Math.max(Number(totalUnits) || 0, 0));
  let totalBill = 0;

  for (const tier of TARIFF_TIERS) {
    if (remaining <= 0) break;

    const unitsInTier = Math.min(remaining, tier.limit);
    totalBill += unitsInTier * tier.rate;
    remaining -= unitsInTier;
  }

  return totalBill;
}

function getMonthDates(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('month must use YYYY-MM format.');
  }

  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => (
    `${year}-${String(monthNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
  ));
}

function findActiveSnapshot(snapshots, date) {
  return snapshots.reduce((active, snapshot) => {
    if (snapshot.effectiveDate > date) return active;

    if (!active || snapshot.effectiveDate > active.effectiveDate) return snapshot;

    if (
      snapshot.effectiveDate === active.effectiveDate
      && new Date(snapshot.savedAt).getTime() >= new Date(active.savedAt).getTime()
    ) {
      return snapshot;
    }

    return active;
  }, null);
}

function buildMonthlyEstimate({ month, snapshots = [] }) {
  const dates = getMonthDates(month);
  const orderedSnapshots = [...snapshots].sort((a, b) => (
    a.effectiveDate.localeCompare(b.effectiveDate)
    || new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
  ));
  const applianceTotals = new Map();

  const timeline = dates.map((date) => {
    const snapshot = findActiveSnapshot(orderedSnapshots, date);
    const daily = buildDailyBreakdown(snapshot?.appliances || []);

    daily.items.forEach((item) => {
      const key = item.applianceId || `${item.category}:${item.name}`;
      const existing = applianceTotals.get(key) || {
        applianceId: item.applianceId,
        category: item.category,
        name: item.name,
        totalUnits: 0,
      };
      existing.totalUnits += item.dailyUnits;
      applianceTotals.set(key, existing);
    });

    return {
      date,
      dailyUnits: round(daily.totalDailyUnits),
    };
  });

  const totalUnits = timeline.reduce((sum, day) => sum + day.dailyUnits, 0);
  const breakdown = [...applianceTotals.values()]
    .map((item) => ({
      ...item,
      totalUnits: round(item.totalUnits),
      percentage: totalUnits > 0 ? round((item.totalUnits / totalUnits) * 100, 2) : 0,
    }))
    .sort((a, b) => b.totalUnits - a.totalUnits);

  return {
    estimatedPeriod: {
      month,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    },
    totalUnits: round(totalUnits),
    totalBill: round(calculateTieredBill(totalUnits), 2),
    timeline,
    breakdown,
  };
}

function getLatestSnapshot(snapshots = []) {
  return snapshots.reduce((latest, snapshot) => {
    if (!latest || snapshot.effectiveDate > latest.effectiveDate) return snapshot;

    if (
      snapshot.effectiveDate === latest.effectiveDate
      && new Date(snapshot.savedAt).getTime() > new Date(latest.savedAt).getTime()
    ) {
      return snapshot;
    }

    return latest;
  }, null);
}

function buildRecommendations({ month, snapshots = [], monthlyBudget }) {
  const baseEstimate = buildMonthlyEstimate({ month, snapshots });
  const totalBill = baseEstimate.totalBill;
  const budget = Number(monthlyBudget) || 0;
  const isOverBudget = totalBill > budget;
  const overBudgetAmount = Math.max(totalBill - budget, 0);

  if (!isOverBudget) {
    return {
      month,
      totalBill,
      monthlyBudget: budget,
      isOverBudget: false,
      overBudgetAmount: 0,
      recommendations: [],
    };
  }

  const latestSnapshot = getLatestSnapshot(snapshots);
  const devices = latestSnapshot?.appliances || [];
  const candidates = devices.map((device) => {
    const adjustedSnapshots = snapshots.map((snapshot) => ({
      ...snapshot,
      appliances: (snapshot.appliances || []).map((appliance) => (
        appliance.applianceId === device.applianceId
          ? {
              ...appliance,
              minutesPerDay: Math.max((Number(appliance.minutesPerDay) || 0) - 60, 0),
            }
          : { ...appliance }
      )),
    }));
    const reducedEstimate = buildMonthlyEstimate({ month, snapshots: adjustedSnapshots });
    const savings = Math.max(totalBill - reducedEstimate.totalBill, 0);

    return {
      applianceId: device.applianceId,
      name: device.name,
      category: device.category,
      currentMinutesPerDay: Number(device.minutesPerDay) || 0,
      suggestedMinutesPerDay: Math.max((Number(device.minutesPerDay) || 0) - 60, 0),
      reducedHoursPerDay: 1,
      savings,
    };
  });

  const recommendations = candidates
    .filter((item) => item.currentMinutesPerDay > 0 && item.savings > 0)
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 3);

  return {
    month,
    totalBill,
    monthlyBudget: budget,
    isOverBudget: true,
    overBudgetAmount,
    recommendations,
  };
}

module.exports = {
  TARIFF_TIERS,
  calculateApplianceDailyUnits,
  buildDailyBreakdown,
  calculateTieredBill,
  getMonthDates,
  buildMonthlyEstimate,
  buildRecommendations,
};
