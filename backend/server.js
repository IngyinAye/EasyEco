const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { startDailyTipScheduler } = require('./notification');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('API Running');
});

app.use('/api/users', require('./routes/userRoutes'));

const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

const usageRoutes = require('./routes/usageRoutes');
app.use('/api/usage', usageRoutes);

const apiRoutes = require('./routes/apiRoutes');
app.use('/api', apiRoutes);

app.use('/api/chat', require('./routes/chatRoutes'));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      startDailyTipScheduler();
    });
  } catch (error) {
    const isAtlasAccessError =
      error?.message?.includes('tlsv1 alert internal error') ||
      error?.name === 'MongooseServerSelectionError';

    if (isAtlasAccessError) {
      console.error(
        'MongoDB Atlas rejected the connection. In Atlas, add this computer\'s public IP to Network Access > IP Access List, then restart the server.'
      );
    } else {
      console.error('MongoDB connection failed:', error.message);
    }

    process.exit(1);
  }
};

startServer();
