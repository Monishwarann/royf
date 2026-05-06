const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;


// Routes
const apiRoutes = require('./routes/api');
app.use('/_/backend', apiRoutes);

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    name: 'TrustBite Backend API',
    endpoints: {
      health: '/_/backend/health',
      scan: '/_/backend/scan/:barcode'
    }
  });
});

app.get('/_/backend/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is reachable' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
