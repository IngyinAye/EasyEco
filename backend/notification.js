const cron = require('node-cron');
const { getMessaging } = require('firebase-admin/messaging');
const { morningTips, noonTips, eveningTips, nightTips } = require('./data/energyTips');
require('./config/firebaseAdmin');

const DAILY_TIPS_TOPIC = 'daily_energy_tips';
const TIME_ZONE = 'Asia/Yangon';

const tipsByPeriod = {
  morning: morningTips,
  noon: noonTips,
  evening: eveningTips,
  night: nightTips,
};

function getMyanmarDayIndex() {
  const day = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    day: 'numeric',
  }).format(new Date()));

  return (day - 1) % 30;
}

async function sendDailyTip(period) {
  const tips = tipsByPeriod[period];
  if (!tips) throw new Error(`Unknown notification period: ${period}`);

  const body = tips[getMyanmarDayIndex()];
  const response = await getMessaging().send({
    // A notification payload lets Android display this from the system tray
    // while the app is backgrounded or removed from recent apps.
    notification: {
      title: 'EasyEco Energy Tip',
      body,
    },
    data: {
      title: 'EasyEco Energy Tip',
      body,
      type: 'daily_tip',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'easyeco_default',
        icon: 'ic_stat_easyeco',
        sound: 'default',
        notificationPriority: 'PRIORITY_HIGH',
      },
    },
    topic: DAILY_TIPS_TOPIC,
  });

  console.log(`${period} tip sent:`, response);
  return response;
}

let dailyTipSchedulerStarted = false;

function startDailyTipScheduler() {
  if (dailyTipSchedulerStarted) return;
  dailyTipSchedulerStarted = true;

  const options = { timezone: TIME_ZONE };

  cron.schedule('0 8 * * *', () => sendDailyTip('morning').catch(console.error), options);
  cron.schedule('0 12 * * *', () => sendDailyTip('noon').catch(console.error), options);
  cron.schedule('0 17 * * *', () => sendDailyTip('evening').catch(console.error), options);
  cron.schedule('0 21 * * *', () => sendDailyTip('night').catch(console.error), options);

  console.log('Daily Energy Tip scheduler started (Asia/Yangon: 08:00, 12:00, 17:00, 21:00).');
}

module.exports = { DAILY_TIPS_TOPIC, sendDailyTip, startDailyTipScheduler };

if (require.main === module) {
  const period = process.argv[2] || 'morning';
  sendDailyTip(period).catch((error) => {
    console.error('Failed to send daily tip:', error);
    process.exitCode = 1;
  });
}
