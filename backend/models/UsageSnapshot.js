const mongoose = require('mongoose');

const applianceSchema = new mongoose.Schema(
  {
    applianceId: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    watt: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    minutesPerDay: { type: Number, required: true, min: 0, max: 1440 },
    dutyCyclePercent: { type: Number, default: 100, min: 0, max: 100 },
  },
  { _id: false }
);

const usageSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    effectiveDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    savedAt: { type: Date, default: Date.now },
    timezone: { type: String, default: 'Asia/Rangoon' },
    appliances: {
      type: [applianceSchema],
      default: [],
    },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

usageSnapshotSchema.index({ userId: 1, effectiveDate: 1, savedAt: 1 });

module.exports = mongoose.model('UsageSnapshot', usageSnapshotSchema);