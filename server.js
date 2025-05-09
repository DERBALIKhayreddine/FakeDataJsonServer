const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares)

// Custom route for OHLCV data with query parameters
server.get('/api/ohlcv', (req, res) => {
  const { symbol, interval, start, end } = req.query
  
  if (!symbol || !interval || !start || !end) {
    return res.status(400).json({
      error: 'Missing required query parameters: symbol, interval, start, end'
    })
  }

  const db = router.db.getState()
  const ohlcvData = db.ohlcv.find(item => 
    item.symbol === symbol && item.interval === interval
  )

  if (!ohlcvData) {
    return res.status(404).json({
      error: 'No data found for the specified symbol and interval'
    })
  }

  const filteredBars = ohlcvData.bars.filter(bar => {
    const barDate = new Date(bar.timestamp)
    const startDate = new Date(start)
    const endDate = new Date(end)
    return barDate >= startDate && barDate <= endDate
  })

  res.json({
    symbol,
    interval,
    bars: filteredBars
  })
})

// Use default router
server.use(router)

// Start server
const PORT = 3000
server.listen(PORT, () => {
  console.log(`JSON Server is running on port ${PORT}`)
  console.log(`OHLCV endpoint: GET /api/ohlcv?symbol=AAPL&interval=1d&start=2021-01-01T00:00:00Z&end=2021-01-10T00:00:00Z`)
})