const jsonServer = require('json-server');
const fs = require('fs');
const server = jsonServer.create();
const middlewares = jsonServer.defaults();

// Load db.json and transform if necessary
let dbData;
try {
  dbData = JSON.parse(fs.readFileSync('db.json'));
} catch (error) {
  console.error('❌ Error reading db.json:', error.message);
  process.exit(1);
}

// Ensure dbData is an object with an 'ohlcv' key
const routerData = Array.isArray(dbData) ? { ohlcv: dbData } : dbData;

// Initialize json-server router with transformed data
const router = jsonServer.router(routerData);

// Set default middlewares (logger, static, cors, and no-cache)
server.use(middlewares);

// Custom route for OHLCV data with query parameters
server.get('/api/ohlcv', (req, res) => {
  const { symbol, interval, start, end } = req.query;

  // Validate query params
  if (!symbol || !interval || !start || !end) {
    return res.status(400).json({
      error: 'Missing required query parameters: symbol, interval, start, end',
    });
  }

  // Parse dates safely
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate) || isNaN(endDate)) {
    return res.status(400).json({
      error: 'Invalid date format. Use ISO 8601 (e.g., 2021-01-01T00:00:00Z)',
    });
  }

  // Access full db state
  const db = router.db.getState();

  // Find matching OHLCV record
  const matchingRecords = db.ohlcv.filter(
    (item) => item.symbol === symbol && item.interval === interval
  );

  if (matchingRecords.length === 0) {
    return res.status(404).json({
      error: 'No data found for the specified symbol and interval',
    });
  }

  // Filter bars within date range
  const filteredBars = matchingRecords[0].bars.filter((bar) => {
    const barDate = new Date(bar.timestamp);
    return barDate >= startDate && barDate <= endDate;
  });

  return res.json({
    symbol,
    interval,
    bars: filteredBars,
  });
});

// Mount the default router *after* custom routes
server.use('/api', router);

// Start server
const PORT = process.env.PORT || 3000; // Use Render's PORT env variable
server.listen(PORT, () => {
  console.log(`✅ JSON Server is running on port ${PORT}`);
  console.log(
    `📈 OHLCV endpoint: GET http://localhost:${PORT}/api/ohlcv?symbol=AAPL&interval=1d&start=2021-01-01T00:00:00Z&end=2021-01-10T00:00:00Z`
  );
});
