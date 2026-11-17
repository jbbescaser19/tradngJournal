"use strict";

require("dotenv").config();

const express = require("express");
const crypto = require("node:crypto");
const path = require("node:path");
const model = require("./models/tradeModel");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, "..");

app.disable("x-powered-by");
app.use(express.json({ limit: "35mb" }));

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");

  const allowed = [`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`];

  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.headers.origin &&
    !allowed.includes(req.headers.origin)
  ) {
    return res.status(403).json({
      message: "Request origin is not allowed.",
    });
  }

  next();
});

function fail(res, error) {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "That date already has a trade for the selected 4H candle.",
    });
  }

  if (error.status && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({
      message: error.message,
    });
  }

  console.error("API error:", error);

  return res.status(500).json({
    message: "Database error. See the backend terminal for details.",
  });
}

function bad(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function validateDate(date) {
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    bad("Choose a valid trade date.");
  }

  return date;
}

function validateTrade(input, id = crypto.randomUUID()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    bad("Invalid trade data.");
  }

  const date = validateDate(input.date);
  const strategy = Number(input.strategy);

  if (![1, 2].includes(strategy)) {
    bad("Choose the 1st or 2nd 4H candle.");
  }

  const symbol = String(input.symbol || "")
    .trim()
    .toUpperCase();

  if (!["XAUUSDT", "ETHUSDT", "BTCUSDT"].includes(symbol)) {
    bad("Select Gold, Ethereum, or Bitcoin.");
  }

  if (!["LONG", "SHORT"].includes(input.direction)) {
    bad("Invalid trade direction.");
  }

  if (!["OPEN", "TP", "SL", "BE"].includes(input.result)) {
    bad("Invalid trade result.");
  }

  const rr =
    input.rr === "" || input.rr === null || input.rr === undefined
      ? null
      : Number(input.rr);

  if (
    rr !== null &&
    (!Number.isFinite(rr) ||
      rr < 0 ||
      rr > 99999.999 ||
      Math.round(rr * 1000) / 1000 !== rr)
  ) {
    bad("Risk:Reward must be a positive number with up to 3 decimal places.");
  }

  const notes =
    input.notes === undefined || input.notes === null ? "" : input.notes;

  const review =
    input.review === undefined || input.review === null ? "" : input.review;

  if (
    typeof notes !== "string" ||
    notes.length > 5000 ||
    typeof review !== "string" ||
    review.length > 5000
  ) {
    bad("Notes and review must be at most 5000 characters each.");
  }

  return {
    id,
    date,
    strategy,
    symbol,
    direction: input.direction,
    result: input.result,
    rr,
    notes,
    review,
  };
}

function parsePicture(input) {
  if (!input) {
    return {
      mime: null,
      data: null,
    };
  }

  if (typeof input !== "string") {
    bad("Invalid screenshot.");
  }

  const match =
    /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      input,
    );

  if (!match) {
    bad("Screenshot must be a JPG, PNG, or WebP image.");
  }

  const mime = match[1];
  const data = Buffer.from(match[2], "base64");

  if (!data.length || data.length > 350000) {
    bad("Screenshot is too large. Use a compressed image.");
  }

  const looksLike =
    mime === "image/png"
      ? data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
        : data.toString("ascii", 0, 4) === "RIFF" &&
          data.toString("ascii", 8, 12) === "WEBP";

  if (!looksLike) {
    bad("Screenshot file format does not match its contents.");
  }

  return {
    mime,
    data,
  };
}

function pictureInput(body, allowKeep) {
  const action = body?.imageAction || (allowKeep ? "keep" : "remove");

  if (
    !["keep", "replace", "remove"].includes(action) ||
    (action === "keep" && !allowKeep)
  ) {
    bad("Invalid screenshot action.");
  }

  return {
    action,
    picture:
      action === "replace"
        ? parsePicture(body.image)
        : { mime: null, data: null },
  };
}

app.get("/api/health", async (req, res) => {
  try {
    await model.ping();

    res.json({
      ok: true,
      database: "connected",
    });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/trades", async (req, res) => {
  try {
    res.json({
      trades: await model.list(),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/trades/:id/image", async (req, res) => {
  try {
    const result = await model.image(req.params.id);

    if (!result || !result.image_data) {
      return res.status(404).end();
    }

    res.type(result.image_mime);
    res.send(result.image_data);
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/trades", async (req, res) => {
  try {
    const record = validateTrade(req.body);
    const { picture } = pictureInput(req.body, false);

    res.status(201).json({
      trade: await model.create(record, picture),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.put("/api/trades/:id", async (req, res) => {
  try {
    if (!(await model.get(req.params.id))) {
      return res.status(404).json({
        message: "Trade not found.",
      });
    }

    const record = validateTrade(req.body, req.params.id);

    const { action, picture } = pictureInput(req.body, true);

    res.json({
      trade: await model.update(req.params.id, record, action, picture),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.delete("/api/trades/:id", async (req, res) => {
  try {
    if (!(await model.remove(req.params.id))) {
      return res.status(404).json({
        message: "Trade not found.",
      });
    }

    res.json({ ok: true });
  } catch (error) {
    fail(res, error);
  }
});

app.delete("/api/trades", async (req, res) => {
  try {
    await model.clear();
    res.json({ ok: true });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/backup", async (req, res) => {
  try {
    res.set(
      "Content-Disposition",
      'attachment; filename="TradeLog-MySQL-backup.json"',
    );

    res.json({
      app: "TradeLog MySQL",
      version: 3,
      exportedAt: new Date().toISOString(),
      trades: await model.backup(),
    });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/restore", async (req, res) => {
  try {
    const body = req.body;

    const isLocal = body?.app === "TradeLog Local" && body.version === 2;

    const isMysql = body?.app === "TradeLog MySQL" && body.version === 3;

    if (
      (!isLocal && !isMysql) ||
      !Array.isArray(body.trades) ||
      body.trades.length > 3000
    ) {
      bad("Choose a valid TradeLog JSON backup with at most 3000 records.");
    }

    const keys = new Set();

    const records = body.trades.map((item) => {
      const record = validateTrade(item);

      const key = `${record.date}|${record.strategy}`;

      if (keys.has(key)) {
        bad("Backup contains duplicate candles for a date.");
      }

      keys.add(key);

      return {
        record,
        picture: parsePicture(item.image),
      };
    });

    await model.restore(records);

    res.json({
      ok: true,
      count: records.length,
    });
  } catch (error) {
    fail(res, error);
  }
});

// Serve only the public frontend files.
// Never expose backend/.env.

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.get("/style.css", (req, res) => {
  res.sendFile(path.join(ROOT, "style.css"));
});

app.get("/script.js", (req, res) => {
  res.sendFile(path.join(ROOT, "script.js"));
});

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "The uploaded backup is too large.",
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      message: "Invalid JSON.",
    });
  }

  fail(res, error);
});

model
  .ping()
  .then(() => {
    app.listen(PORT, "127.0.0.1", () => {
      console.log("MySQL connected: tradelog_db");
      console.log(`Open TradeLog at http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(
      "Could not connect to MySQL. Check backend/.env and run the SQL setup:",
      error.message,
    );

    process.exit(1);
  });
