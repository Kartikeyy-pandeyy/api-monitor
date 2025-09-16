import fs from "fs";
import axios from "axios";

const API_FILE = process.env.ENDPOINTS_FILE || "/app/checker/apis.json";
const OUT_FILE = process.env.OUTPUT_FILE || "/data/status.json";
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || "5000", 10);

async function checkOne(api) {
  const start = Date.now();
  try {
    const res = await axios.get(api.url, { timeout: TIMEOUT_MS, validateStatus: () => true });
    return {
      name: api.name,
      url: api.url,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      latency_ms: Date.now() - start,
      checked_at: new Date().toISOString(),
      error: null
    };
  } catch (err) {
    return {
      name: api.name,
      url: api.url,
      status: null,
      ok: false,
      latency_ms: Date.now() - start,
      checked_at: new Date().toISOString(),
      error: err.message
    };
  }
}

async function main() {
  const apis = JSON.parse(fs.readFileSync(API_FILE, "utf-8"));
  const results = await Promise.all(apis.map(checkOne));
  const payload = {
    generated_at: new Date().toISOString(),
    results
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT_FILE} with ${results.length} entries`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
