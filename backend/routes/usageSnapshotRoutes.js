const express = require('express');
const router = express.Router();
const UsageSnapshot = require('../models/UsageSnapshot');
const getUsageUserKey = require('../middleware/usageAuth');

const DEFAULT_TIMEZONE = 'Asia/Rangoon';
const TARIFF_TIERS = [
  { limit: 50, rate: 50 },
  { limit: 100, rate: 100 },
  { limit: 200, rate: 150 },
  { limit: null, rate: 300 },
];

router.use(getUsageUserKey);

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch (_) {
    return false;
  }
}

function localDateString(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const getPart = (type) => parts.find((part) => part.type === type).value;
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

function monthBounds(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12) return null;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

function daysBetween(start, end) {
  const days = [];
  const current = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

function calculateDailyUnits(snapshot) {
  return snapshot.appliances.reduce((total, appliance) => {
    const watts = Number(appliance.watt);
    const quantity = Number(appliance.quantity);
    const hours = Number(appliance.minutesPerDay) / 60;
    const dutyCycle = Number(appliance.dutyCyclePercent) / 100;
    return total + (watts * quantity * hours * dutyCycle) / 1000;
  }, 0);
}

function calculateTieredBill(totalUnits) {
  let remaining = Math.max(0, totalUnits);
  let previousLimit = 0;
  let bill = 0;

  for (const tier of TARIFF_TIERS) {
    const capacity = tier.limit === null ? Infinity : tier.limit - previousLimit;
    const unitsInTier = Math.min(remaining, capacity);
    bill += unitsInTier * tier.rate;
    remaining -= unitsInTier;
    if (tier.limit !== null) previousLimit = tier.limit;
    if (remaining <= 0) break;
  }
  return Math.round(bill);
}

function serializeSnapshot(snapshot) {
  return {
    id: snapshot._id,
    effectiveDate: snapshot.effectiveDate,
    timezone: snapshot.timezone,
    appliances: snapshot.appliances,
    createdAt: snapshot.createdAt,
  };
}

router.post('/', async (req, res) => {
  try {
    const timezone = req.body.timezone || DEFAULT_TIMEZONE;
    const effectiveDate = req.body.effectiveDate || localDateString(timezone);
    const idempotencyKey = req.get('Idempotency-Key') || req.body.idempotencyKey;
    const { appliances } = req.body;

    if (!isValidTimezone(timezone)) return res.status(400).json({ message: 'Invalid timezone' });
    if (!isValidDateString(effectiveDate)) return res.status(400).json({ message: 'effectiveDate must be YYYY-MM-DD' });
    if (effectiveDate < localDateString(timezone)) {
      return res.status(400).json({ message: 'Backdated configurations are not allowed' });
    }
    if (!Array.isArray(appliances)) return res.status(400).json({ message: 'appliances must be an array' });

    const normalizedAppliances = appliances.map((item, index) => ({
      applianceId: String(item.applianceId || `appliance-${index + 1}`),
      category: String(item.category || '').trim(),
      name: String(item.name || '').trim(),
      watt: Number(item.watt),
      quantity: Number(item.quantity || 1),
      minutesPerDay: Number(item.minutesPerDay),
      dutyCyclePercent: Number(item.dutyCyclePercent ?? 100),
    }));

    const invalid = normalizedAppliances.some((item) => (
      !item.category || !item.name || !Number.isFinite(item.watt) || item.watt < 0 ||
      !Number.isInteger(item.quantity) || item.quantity < 1 ||
      !Number.isFinite(item.minutesPerDay) || item.minutesPerDay < 0 || item.minutesPerDay > 1440 ||
      !Number.isFinite(item.dutyCyclePercent) || item.dutyCyclePercent < 0 || item.dutyCyclePercent > 100
    ));
    if (invalid) return res.status(400).json({ message: 'One or more appliances are invalid' });

    if (idempotencyKey) {
      const existing = await UsageSnapshot.findOne({ user: req.usageUserKey, idempotencyKey });
      if (existing) return res.status(200).json(serializeSnapshot(existing));
    }

    const snapshot = await UsageSnapshot.create({
      user: req.usageUserKey,
      effectiveDate,
      timezone,
      appliances: normalizedAppliances,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
    return res.status(201).json(serializeSnapshot(snapshot));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'This save was already processed' });
    return res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const snapshots = await UsageSnapshot.find({ user: req.usageUserKey })
      .sort({ effectiveDate: -1, createdAt: -1 })
      .lean();
    res.json(snapshots.map(serializeSnapshot));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/estimate', async (req, res) => {
  try {
    const timezone = req.query.timezone || DEFAULT_TIMEZONE;
    const month = req.query.month || localDateString(timezone).slice(0, 7);
    const bounds = monthBounds(month);
    if (!isValidTimezone(timezone)) return res.status(400).json({ message: 'Invalid timezone' });
    if (!bounds) return res.status(400).json({ message: 'month must be YYYY-MM' });

    // Includes the latest snapshot before the month because it remains active.
    const snapshots = await UsageSnapshot.find({
      user: req.usageUserKey,
      effectiveDate: { $lte: bounds.end },
    }).sort({ effectiveDate: 1, createdAt: 1 }).lean();

    let snapshotIndex = 0;
    let activeSnapshot = null;
    const timeline = [];
    for (const date of daysBetween(bounds.start, bounds.end)) {
      while (snapshotIndex < snapshots.length && snapshots[snapshotIndex].effectiveDate <= date) {
        activeSnapshot = snapshots[snapshotIndex];
        snapshotIndex += 1;
      }
      timeline.push(activeSnapshot ? {
        date,
        status: 'estimated',
        snapshotId: String(activeSnapshot._id),
        dailyUnits: calculateDailyUnits(activeSnapshot),
      } : { date, status: 'no-data', dailyUnits: null });
    }

    const estimatedDays = timeline.filter((day) => day.status === 'estimated');
    const totalUnits = estimatedDays.reduce((sum, day) => sum + day.dailyUnits, 0);
    const today = localDateString(timezone);
    const toDateUnits = timeline
      .filter((day) => day.status === 'estimated' && day.date <= today)
      .reduce((sum, day) => sum + day.dailyUnits, 0);
    const latestSnapshot = snapshots.length ? snapshots[snapshots.length - 1] : null;
    res.json({
      month,
      currency: 'MMK',
      estimatedPeriod: estimatedDays.length ? {
        startDate: estimatedDays[0].date,
        endDate: estimatedDays[estimatedDays.length - 1].date,
        daysWithData: estimatedDays.length,
        daysWithoutData: timeline.length - estimatedDays.length,
      } : null,
      totalUnits: Number(totalUnits.toFixed(3)),
      totalBill: calculateTieredBill(totalUnits),
      toDateUnits: Number(toDateUnits.toFixed(3)),
      toDateBill: calculateTieredBill(toDateUnits),
      latestConfiguration: latestSnapshot ? serializeSnapshot(latestSnapshot) : null,
      timeline: timeline.map((day) => ({ ...day, dailyUnits: day.dailyUnits === null ? null : Number(day.dailyUnits.toFixed(3)) })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
