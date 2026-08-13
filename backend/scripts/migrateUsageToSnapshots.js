/*
 * One-time migration for the application's legacy per-appliance Usage rows.
 * It intentionally starts the imported configuration today: legacy rows do not
 * contain enough information to reconstruct trustworthy historical snapshots.
 * Run once after deployment: npm run migrate:usage-snapshots
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const Usage = require('../models/Usage');
const UsageSnapshot = require('../models/UsageSnapshot');

const parseWatt = (value) => Number(String(value || '').match(/[\d.]+/)?.[0] || 0);
const parseMinutes = (value) => {
  const text = String(value || '');
  return Number(text.match(/(\d+)\s*hr/i)?.[1] || 0) * 60 + Number(text.match(/(\d+)\s*min/i)?.[1] || 0);
};
const today = () => new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Rangoon', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

async function migrate() {
  await connectDB();
  const date = today();
  const effectiveDate = `${date.year}-${date.month}-${date.day}`;
  const usages = await Usage.find({}).sort({ createdAt: 1 }).lean();
  const byUser = usages.reduce((groups, usage) => {
    groups[usage.user] = [...(groups[usage.user] || []), usage];
    return groups;
  }, {});

  for (const [user, appliances] of Object.entries(byUser)) {
    const exists = await UsageSnapshot.exists({ user });
    if (exists) continue;
    await UsageSnapshot.create({
      user,
      effectiveDate,
      timezone: 'Asia/Rangoon',
      appliances: appliances.map((usage) => ({
        applianceId: String(usage._id),
        category: usage.category,
        name: usage.name,
        watt: parseWatt(usage.watt),
        quantity: 1,
        minutesPerDay: parseMinutes(usage.time),
        dutyCyclePercent: 100,
      })),
    });
  }
  console.log(`Migrated ${Object.keys(byUser).length} user configuration(s) effective ${effectiveDate}.`);
  process.exit(0);
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
