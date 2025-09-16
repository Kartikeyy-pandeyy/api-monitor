// checker/checker.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const RETRY_ATTEMPTS = parseInt(process.env.RETRY_ATTEMPTS || '3', 10);
const TIMEOUT_MS     = parseInt(process.env.TIMEOUT_MS     || '5000', 10);
const HISTORY_LIMIT  = parseInt(process.env.HISTORY_LIMIT  || '1000', 10);

const ENDPOINTS_FILE = process.env.ENDPOINTS_FILE || path.join(__dirname, 'apis.json'); // plural
const OUTPUT_DIR     = process.env.OUTPUT_DIR     || '/app/frontend';
const STATUS_FILE    = path.join(OUTPUT_DIR, 'status.json');
const HISTORY_FILE   = path.join(OUTPUT_DIR, 'history.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

async function checkAPI(api) {
  const url = api.url;
  const name = api.name || url;
  const timeout = api.timeout || TIMEOUT_MS;

  let lastLatency = 0;
  let lastError = null;
  let lastStatusCode = null;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const start = Date.now();
    try {
      const res = await axios.get(url, { timeout });
      const latency = Date.now() - start;

      // Ensure latency is positive and reasonable
      const validLatency = Math.max(0, Math.round(latency));

      return {
        name,
        url,
        status: 'UP',
        code: res.status,
        latency: validLatency,
        attempt,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      const requestLatency = Date.now() - start;
      lastLatency = Math.max(0, Math.round(requestLatency));
      lastError = err.code || err.message;
      lastStatusCode = err.response?.status || 503;

      if (attempt === RETRY_ATTEMPTS) {
        return {
          name,
          url,
          status: 'DOWN',
          code: lastStatusCode,
          error: lastError,
          latency: lastLatency,
          attempt,
          timestamp: new Date().toISOString()
        };
      }

      // Wait before retry (this delay is NOT included in latency calculation)
      await new Promise(r => setTimeout(r, 200 * attempt));
    }
  }
}

async function run() {
  if (!fs.existsSync(ENDPOINTS_FILE)) {
    console.error(`❌ ENDPOINTS_FILE not found: ${ENDPOINTS_FILE}`);
    process.exit(2);
  }
  const endpoints = readJsonSafe(ENDPOINTS_FILE, []);
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    console.error(`❌ No endpoints found in ${ENDPOINTS_FILE}`);
    process.exit(2);
  }

  console.log(`▶️  Checking ${endpoints.length} endpoints from ${ENDPOINTS_FILE}`);
  ensureDir(OUTPUT_DIR);

  const results = await Promise.all(endpoints.map(checkAPI));

  fs.writeFileSync(STATUS_FILE, JSON.stringify(results, null, 2));
  console.log(`✅ Wrote ${STATUS_FILE}`);

  const prior = readJsonSafe(HISTORY_FILE, []);
  const merged = prior.concat(results);
  const trimmed = merged.length > HISTORY_LIMIT ? merged.slice(merged.length - HISTORY_LIMIT) : merged;

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  console.log(`✅ Updated ${HISTORY_FILE} (kept ${trimmed.length}/${HISTORY_LIMIT})`);

  const up = results.filter(r => r.status === 'UP').length;
  console.log(`📊 Summary: total=${results.length}, UP=${up}, DOWN=${results.length - up}`);
}

run().catch(e => { console.error('❌ Unhandled error:', e); process.exit(1); });
