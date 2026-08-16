const express = require('express');
const router = express.Router();
const UsageSnapshot = require('../models/UsageSnapshot');
const User = require('../models/User');
const getUsageUserKey = require('../middleware/usageAuth');
const {
  buildMonthlyEstimate,
  buildRecommendations,
  calculateTieredBill,
  getMonthDates,
} = require('../services/estimateService');

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

function rangoonDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Rangoon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const value = Object.fromEntries(
    parts
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value])
  );

  return `${value.year}-${value.month}-${value.day}`;
}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

router.use(getUsageUserKey);

router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        message: 'Request body must be a JSON object.',
      });
    }

    const {
      appliances,
      timezone = 'Asia/Rangoon',
      effectiveDate = rangoonDate(),
    } = req.body;
    const idempotencyKey = req.header('Idempotency-Key');

    if (!isValidIsoDate(effectiveDate)) {
      return res.status(400).json({
        message: 'effectiveDate must be a valid YYYY-MM-DD date.',
      });
    }

    const today = rangoonDate();
    if (effectiveDate < today) {
      return res.status(400).json({
        message: 'Past dates cannot be used for a usage snapshot.',
      });
    }

    if (timezone !== 'Asia/Rangoon') {
      return res.status(400).json({
        message: 'timezone must be Asia/Rangoon.',
      });
    }

    if (!Array.isArray(appliances)) {
      return res.status(400).json({
        message: 'appliances must be an array.',
      });
    }

    for (const appliance of appliances) {
      if (!appliance || typeof appliance !== 'object') {
        return res.status(400).json({
          message: 'Each appliance must be an object.',
        });
      }

      const {
        applianceId,
        category,
        name,
        watt,
        quantity,
        minutesPerDay,
        dutyCyclePercent = 100,
      } = appliance;

      if (!applianceId || !category || !name) {
        return res.status(400).json({
          message: 'Each appliance requires applianceId, category, and name.',
        });
      }

      if (!Number.isFinite(watt) || watt < 0) {
        return res.status(400).json({
          message: 'Each appliance watt must be a number greater than or equal to 0.',
        });
      }

      if (!Number.isFinite(quantity) || quantity < 1) {
        return res.status(400).json({
          message: 'Each appliance quantity must be at least 1.',
        });
      }

      if (
        !Number.isFinite(minutesPerDay)
        || minutesPerDay < 0
        || minutesPerDay > 1440
      ) {
        return res.status(400).json({
          message: 'minutesPerDay must be between 0 and 1440.',
        });
      }

      if (
        !Number.isFinite(dutyCyclePercent)
        || dutyCyclePercent < 0
        || dutyCyclePercent > 100
      ) {
        return res.status(400).json({
          message: 'dutyCyclePercent must be between 0 and 100.',
        });
      }
    }

    if (idempotencyKey) {
      const existing = await UsageSnapshot.findOne({ idempotencyKey });

      if (existing) {
        return res.status(200).json(existing);
      }
    }

    const snapshot = await UsageSnapshot.create({
      userId: req.usageUserKey,
      effectiveDate,
      timezone,
      appliances,
      ...(idempotencyKey && { idempotencyKey }),
    });

    res.status(201).json(snapshot);
  } catch (error) {
    if (error?.code === 11000) {
      const snapshot = await UsageSnapshot.findOne({
        idempotencyKey: req.header('Idempotency-Key'),
      });
      return res.status(200).json(snapshot);
    }

    res.status(400).json({
      message: error.message || 'Could not save usage snapshot.',
    });
  }
});

router.get('/estimate', async (req, res) => {
  try {
    const { month } = req.query;

    // This validates the month and provides the last date for the snapshot query.
    const dates = getMonthDates(month);
    const snapshots = await UsageSnapshot.find({
      userId: req.usageUserKey,
      effectiveDate: { $lte: dates[dates.length - 1] },
    })
      .sort({ effectiveDate: 1, savedAt: 1 })
      .lean();

    const user = await User.findById(req.usageUserKey)
      .select('monthlyBudget')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const estimate = buildMonthlyEstimate({ month, snapshots });
    const today = rangoonDate();
    const currentMonth = today.slice(0, 7);
    const currentUsageUnits = month === currentMonth
      ? estimate.timeline
        .filter((item) => item.date <= today)
        .reduce((sum, item) => sum + item.dailyUnits, 0)
      : estimate.totalUnits;
    const projectedUnits = estimate.totalUnits;
    const currentBill = roundMoney(calculateTieredBill(currentUsageUnits));
    const totalBill = roundMoney(calculateTieredBill(projectedUnits));
    const monthlyBudget = Number(user.monthlyBudget) || 0;
    const rawPercent = monthlyBudget > 0
      ? (totalBill / monthlyBudget) * 100
      : 0;
    const budgetProgressPercent = Math.min(rawPercent, 100);
    const overBudgetAmount = monthlyBudget > 0
      ? Math.max(totalBill - monthlyBudget, 0)
      : 0;
    const latestSnapshot = await UsageSnapshot.findOne({
      userId: req.usageUserKey,
    })
      .sort({ effectiveDate: -1, savedAt: -1 })
      .lean();
    const applianceConsumptionBreakdown = estimate.breakdown.map((item) => ({
      name: item.name,
      percentage: item.percentage,
      monthlyKwh: item.totalUnits,
    }));

    res.json({
      month,
      estimatedPeriod: {
        startDate: estimate.estimatedPeriod.startDate,
        endDate: estimate.estimatedPeriod.endDate,
      },
      currentUsageUnits,
      projectedUnits,
      currentBill,
      totalBill,
      monthlyBudget,
      budgetProgressPercent,
      overBudgetAmount,
      latestConfiguration: latestSnapshot?.appliances || [],
      applianceConsumptionBreakdown,

      // Backwards-compatible fields used by the current mobile app.
      totalUnits: projectedUnits,
      breakdown: applianceConsumptionBreakdown,
      timeline: estimate.timeline,
    });
  } catch (error) {
    if (error.message === 'month must use YYYY-MM format.') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: 'Could not calculate monthly estimate.',
    });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const month = req.query.month || rangoonDate().slice(0, 7);
    const dates = getMonthDates(month);
    const snapshots = await UsageSnapshot.find({
      userId: req.usageUserKey,
      effectiveDate: { $lte: dates[dates.length - 1] },
    })
      .sort({ effectiveDate: 1, savedAt: 1 })
      .lean();
    const user = await User.findById(req.usageUserKey)
      .select('monthlyBudget')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(buildRecommendations({
      month,
      snapshots,
      monthlyBudget: user.monthlyBudget,
    }));
  } catch (error) {
    if (error.message === 'month must use YYYY-MM format.') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: 'Could not generate recommendations.',
    });
  }
});

module.exports = router;
