// checker/checker.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const RETRY_ATTEMPTS = parseInt(process.env.RETRY_ATTEMPTS || '3', 10);
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '5000', 10);

// Where to read endpoints from / write results to
const ENDPOINTS_FILE = process.env.ENDPOINTS_FILE || path.join(__dirname, 'api.json');
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/app/frontend';
const STATUS_FILE = path.join(OUTPUT_DIR, 'status.json');
const HISTORY_FILE = path.join(OUTPUT_DIR, 'history.json');

// History retention (how many result entries to keep total)
const HISTORY_LIMIT = parseInt(process.env.HISTORY_LIMIT || '1000', 10);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function checkAPI(api) {
  const url = api.url;
  const name = api.name || url;
  const timeout = api.timeout || TIMEOUT_MS;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const start = Date.now();
    try {
      const res = await axios.get(url, { timeout });
      const latency = Date.now() - start;
      return {
        name,
        url,
        status: 'UP',
        code: res.status,
        latency,
        attempt,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      // If last attempt, return DOWN
      if (attempt === RETRY_ATTEMPTS) {
        const latency = Date.now() - start;
        return {
          name,
          url,
          status: 'DOWN',
          code: err.response?.status || 503,
          error: err.code || err.message,
          latency,
          attempt,
          timestamp: new Date().toISOString(),
        };
      }
      // brief backoff (optional)
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
}

async function run() {
  // --- Load endpoints ---
  if (!fs.existsSync(ENDPOINTS_FILE)) {
    console.error(`❌ ENDPOINTS_FILE not found: ${ENDPOINTS_FILE}`);
    process.exit(2);
  }
  const endpoints = readJsonSafe(ENDPOINTS_FILE, []);
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    console.error(`❌ No endpoints found in ${ENDPOINTS_FILE}`);
    process.exit(2);
  }

  console.log(`▶️  Checking ${endpoints.length} endpoint(s) from ${ENDPOINTS_FILE}`);
  ensureDir(OUTPUT_DIR);

  // --- Run checks in parallel ---
  const results = await Promise.all(endpoints.map(checkAPI));

  // --- Write status.json ---
  fs.writeFileSync(STATUS_FILE, JSON.stringify(results, null, 2));
  console.log(`✅ Wrote ${STATUS_FILE}`);

  // --- Append to history.json (with retention) ---
  const prior = readJsonSafe(HISTORY_FILE, []);
  // Normalize: prior is an array of result objects from previous runs
  const merged = prior.concat(results);
  const trimmed =
    merged.length > HISTORY_LIMIT ? merged.slice(merged.length - HISTORY_LIMIT) : merged;

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  console.log(
    `✅ Updated ${HISTORY_FILE} (kept ${trimmed.length}/${HISTORY_LIMIT} entries)`
  );

  // --- Brief summary to console (handy in Jenkins logs) ---
  const up = results.filter(r => r.status === 'UP').length;
  const down = results.length - up;
  console.log(`📊 Summary: total=${results.length}, UP=${up}, DOWN=${down}`);
}

run().catch((e) => {
  console.error('❌ Unhandled error:', e);
  process.exit(1);
});
