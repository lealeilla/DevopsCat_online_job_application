const http = require('http');
const app = require('./app');
const { initializeDatabase } = require('./db/init');

async function start(port = process.env.PORT || 3000) {
  try {
    // Initialize database
    await initializeDatabase();

    const server = http.createServer(app);
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

    // graceful shutdown helpers
    function shutdown() {
      console.log('Shutting down server...');
      server.close(() => process.exit(0));
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

module.exports = { start };
