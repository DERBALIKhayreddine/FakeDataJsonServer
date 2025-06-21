const jsonServer = require('json-server');
const fs = require('fs');
const path = require('path');
const server = jsonServer.create();
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Load db.json
let dbData;
try {
  const dbPath = path.join(__dirname, 'db.json');
  dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
} catch (error) {
  console.error('❌ Error reading db.json:', error.message);
  process.exit(1);
}

// Helper to parse date safely
const parseDate = (dateStr) => new Date(dateStr).getTime();

// ---- Custom API routes ---- //

// 1. OHLCV Endpoint
server.get('/api/ohlcv', (req, res) => {
  const { symbol, interval, start, end } = req.query;
  const ohlcvEntry = dbData.ohlcv.find(
    (entry) => entry.symbol === symbol && entry.interval === interval
  );

  if (!ohlcvEntry) {
    return res.status(404).json({ error: 'OHLCV data not found' });
  }

  let filteredData = ohlcvEntry.data;
  if (start) {
    const startDate = parseDate(start);
    filteredData = filteredData.filter((d) => parseDate(d.date) >= startDate);
  }
  if (end) {
    const endDate = parseDate(end);
    filteredData = filteredData.filter((d) => parseDate(d.date) <= endDate);
  }

  res.json({ symbol, interval, data: filteredData });
});

// 2. Indicator Endpoint
// 2. Indicator Endpoint (with indicator selection)
server.get('/api/indicators', (req, res) => {
  const { symbol, interval, indicators } = req.query;
  const indicatorEntry = dbData.indicators.find(
    (entry) => entry.symbol === symbol && entry.interval === interval
  );

  if (!indicatorEntry) {
    return res.status(404).json({ error: 'Indicator data not found' });
  }

  let selectedIndicators = [];
  if (indicators) {
    selectedIndicators = indicators.split(',').map((i) => i.trim());
  }

  // Always include 'date' (and optionally 'close' for context)
  const filteredData = indicatorEntry.indicators.map((item) => {
    const result = { date: item.date };
    if (!indicators) {
      return item; // return all indicators if none specified
    }

    // Optionally include close price
    if (item.close !== undefined) result.close = item.close;

    selectedIndicators.forEach((key) => {
      if (key in item) {
        result[key] = item[key];
      }
    });

    return result;
  });

  res.json({
    symbol,
    interval,
    data: filteredData,
  });
});

// 3. Signals Endpoint
server.get('/api/signals', (req, res) => {
  const { symbol } = req.query;
  const signalEntry = dbData.signals.find((entry) => entry.symbol === symbol);

  if (!signalEntry) {
    return res.status(404).json({ error: 'Signals not found' });
  }

  res.json(signalEntry);
});

// 4. Backtest Endpoint
server.get('/api/backtest', (req, res) => {
  const { symbol } = req.query;
  const backtestEntry = dbData.backtest.find((entry) => entry.symbol === symbol);

  if (!backtestEntry) {
    return res.status(404).json({ error: 'Backtest data not found' });
  }

  res.json(backtestEntry);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Fake JSON API Server running on port ${PORT}`);
});
