const fs = require('fs');
const axios = require('axios');
const path = require('path');

const RETRY_ATTEMPTS = 3;

async function checkAPI(api) {
  let attempt = 0;
  while (attempt < RETRY_ATTEMPTS) {
    try {
      const start = Date.now();
      const res = await axios.get(api.url, { timeout: api.timeout || 5000 });
      const latency = Date.now() - start;
      return {
        name: api.name,
        status: "UP",
        code: res.status,
        latency,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      attempt++;
      if (attempt === RETRY_ATTEMPTS) {
        return {
          name: api.name,
          status: "DOWN",
          code: e.response?.status || 503,
          error: e.code,
          timestamp: new Date().toISOString()
        };
      }
    }
  }
}

async function runChecks() {
  // ✅ Correct path to apis.json relative to this script
  const apisPath = path.join(__dirname, 'apis.json');
  const apis = JSON.parse(fs.readFileSync(apisPath));

  const results = await Promise.all(apis.map(checkAPI));

  // ✅ Write results to frontend directory
  const frontendPath = path.resolve(__dirname, '../frontend');
  const statusPath = path.join(frontendPath, 'status.json');
  const historyPath = path.join(frontendPath, 'history.json');

  fs.writeFileSync(statusPath, JSON.stringify(results, null, 2));

  const history = fs.existsSync(historyPath)
    ? JSON.parse(fs.readFileSync(historyPath))
    : [];
    
  fs.writeFileSync(historyPath, JSON.stringify([...history, ...results], null, 2));
}

runChecks();
