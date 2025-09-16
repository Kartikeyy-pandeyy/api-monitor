const express = require("express");
const fs = require("fs").promises;

const app = express();
const PUBLIC_DIR = "/app/public";
const DATA_FILE  = "/app/public/data/status.json";

app.use(express.static(PUBLIC_DIR, { fallthrough: true }));

app.get("/data/status.json", async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    res.set("Cache-Control","no-store").type("application/json").send(data);
  } catch {
    res.status(404).json({ generated_at: null, results: [] });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 80;
app.listen(port, () => console.log(`Frontend listening on :${port}`));
