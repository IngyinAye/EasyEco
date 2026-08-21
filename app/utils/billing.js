export const BILLING_CATEGORIES = [
  'refrigerator', 'ac', 'washing', 'bulb',
  'fan', 'tv', 'iron', 'microwave',
  'rice', 'pot', 'kettle', 'vacuum',
];

export const RATES = [
  { limit: 50, rate: 50 },
  { limit: 50, rate: 100 },
  { limit: 100, rate: 150 },
  { limit: Infinity, rate: 300 },
];

export const parseWatt = (wattStr = '') => {
  const match = String(wattStr).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const parseTimeToHours = (timeStr = '') => {
  const hrMatch = String(timeStr).match(/(\d+)\s*hr/);
  const minMatch = String(timeStr).match(/(\d+)\s*min/);
  const hours = hrMatch ? parseInt(hrMatch[1], 10) : 0;
  const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
  return hours + minutes / 60;
};

export const calculateMeterBill = (totalUnits) => {
  // Bill the same whole-unit value that is displayed to the user, matching
  // the YESC calculator's unit input.
  let remaining = Math.round(Math.max(Number(totalUnits) || 0, 0));
  let totalCost = 0;

  for (const tier of RATES) {
    if (remaining <= 0) break;
    const unitsInTier = Math.min(remaining, tier.limit);
    totalCost += unitsInTier * tier.rate;
    remaining -= unitsInTier;
  }

  return totalCost;
};

export const buildUsageBillItems = (getUsage) => {
  const allItems = [];

  BILLING_CATEGORIES.forEach((category) => {
    const specs = getUsage(category);

    if (specs && specs.length > 0) {
      specs.forEach((spec) => {
        const watt = parseWatt(spec.watt);
        const hours = parseTimeToHours(spec.time);
        const dailyUnits = (watt * hours) / 1000;
        const monthlyUnits = dailyUnits * 30;

        allItems.push({
          id: spec.id,
          name: spec.name,
          watt: spec.watt,
          hours,
          dailyUnits,
          monthlyUnits,
          dailyCost: calculateMeterBill(dailyUnits),
          monthlyCost: calculateMeterBill(monthlyUnits),
        });
      });
    }
  });

  return allItems;
};

export const summarizeUsageBill = (getUsage) => {
  const allItems = buildUsageBillItems(getUsage);
  const totalDailyUnitsRaw = allItems.reduce((sum, item) => sum + item.dailyUnits, 0);
  const totalMonthlyUnitsRaw = allItems.reduce((sum, item) => sum + item.monthlyUnits, 0);
  const totalDailyUnits = Math.round(totalDailyUnitsRaw);
  const totalMonthlyUnits = Math.round(totalMonthlyUnitsRaw);

  return {
    allItems,
    totalDailyUnits,
    totalMonthlyUnits,
    totalDailyCost: calculateMeterBill(totalDailyUnits),
    totalMonthlyCost: calculateMeterBill(totalMonthlyUnits),
  };
};

export const formatUnits = (units) => {
  const value = Number(units) || 0;
  if (value > 0 && value < 1) {
    return value.toFixed(2);
  }
  return Math.round(value).toString();
};

export const formatCost = (cost) => Math.round(Number(cost) || 0).toLocaleString();

const formatRecommendationTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hr ${minutes} min`;
  }

  if (hours > 0) {
    return `${hours} hr`;
  }

  return `${minutes} min`;
};

export const generateRecommendation = (devices = []) => {
  if (!Array.isArray(devices) || devices.length === 0) {
    return 'Add your device usage to get energy-saving tips.';
  }

  const highestWattDevice = devices.reduce((highest, device) => (
    parseWatt(device.watt) > parseWatt(highest.watt) ? device : highest
  ));

  return `Reduce ${highestWattDevice.name || 'this device'} usage to save energy.`;
};

export const generateDetailedRecommendations = (getUsage, dailyRecords = [], monthlyBudget = 0) => {
  const { allItems, totalMonthlyCost } = summarizeUsageBill(getUsage);
  const recordedCost = Array.isArray(dailyRecords)
    ? dailyRecords.reduce((sum, record) => sum + (Number(record.cost) || 0), 0)
    : 0;
  const estimatedCost = Math.max(totalMonthlyCost, recordedCost);
  const budget = Number(monthlyBudget) || 0;
  const targetSavings = Math.max(Math.round(estimatedCost - budget), 0);

  if (targetSavings === 0) {
    return { isOverBudget: false, recommendations: [], targetSavings: 0 };
  }

  const recommendations = allItems
    .filter((item) => item.monthlyCost > 0)
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .slice(0, 3)
    .map((item) => {
      const reductionMinutes = Math.round(item.hours * 0.1 * 60);
      const reductionTime = formatRecommendationTime(reductionMinutes);

      return {
        id: item.id,
        name: item.name || 'Device',
        iconType: '',
        recommendation: `Reduce ${item.name || 'this device'} usage by ${reductionTime}/day.`,
        savings: Math.max(1, Math.round(item.monthlyCost * 0.1)),
      };
    });

  return { isOverBudget: true, recommendations, targetSavings };
};
