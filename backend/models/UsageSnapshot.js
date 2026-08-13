const mongoose = require('mongoose');

const applianceSchema = new mongoose.Schema(
  {
    applianceId: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    watt: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    minutesPerDay: { type: Number, required: true, min: 0, max: 1440 },
    dutyCyclePercent: { type: Number, min: 0, max: 100, default: 100 },
  },
  { _id: false }
);

// A document is a complete appliance configuration, effective from its date
// until the next snapshot. Documents are deliberately never edited or deleted.
const usageSnapshotSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, index: true },
    effectiveDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    timezone: { type: String, required: true, default: 'Asia/Rangoon' },
    appliances: { type: [applianceSchema], required: true, default: [] },
    idempotencyKey: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

usageSnapshotSchema.index({ user: 1, effectiveDate: 1, createdAt: 1 });
usageSnapshotSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('UsageSnapshot', usageSnapshotSchema);
