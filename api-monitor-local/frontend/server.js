const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const app = express();
app.use(express.json());

const PUBLIC_DIR = "/app/public";
const DATA_FILE  = "/app/public/data/status.json";

const JENKINS_URL   = process.env.JENKINS_URL   || "http://localhost:8080";
const JENKINS_USER  = process.env.JENKINS_USER  || "";
const JENKINS_TOKEN = process.env.JENKINS_TOKEN || "";
const JOB_NAME      = process.env.JENKINS_JOB   || "api-monitor-local";

app.post("/trigger", async (req, res) => {
  try {
    let crumbHeader = {};
    // try crumb
    try {
      const crumbResp = await fetch(`${JENKINS_URL}/crumbIssuer/api/json`, {
        headers: {
          "Authorization": "Basic " + Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString("base64")
        }
      });
      if (crumbResp.ok) {
        const cj = await crumbResp.json();
        crumbHeader[cj.crumbRequestField] = cj.crumb;
      }
    } catch (_) {}

    const resp = await fetch(`${JENKINS_URL}/job/${encodeURIComponent(JOB_NAME)}/build?delay=0sec`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString("base64"),
        ...crumbHeader
      }
    });

    if (!(resp.ok || resp.status === 201 || resp.status === 302)) {
      const txt = await resp.text().catch(()=>"");
      return res.status(500).json({ ok:false, message:`Jenkins trigger failed (${resp.status}) ${txt}` });
    }
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, message:e.message });
  }
});

app.use(express.static(PUBLIC_DIR, { fallthrough: true }));

app.get("/data/status.json", async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    res.set("Cache-Control","no-store").type("application/json").send(data);
  } catch {
    res.status(404).json({ generated_at: null, results: [] });
  }
});

app.get("/health", (req, res) => res.json({ ok:true }));

const port = process.env.PORT || 80;
app.listen(port, () => console.log(`Frontend listening on :${port}`));
