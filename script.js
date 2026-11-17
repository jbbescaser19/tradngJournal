/* TradeLog MySQL - Vanilla JavaScript frontend */
(() => {
  "use strict";

  const API = "/api";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const localDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const today = () => localDate(new Date());

  const parseDate = (str) => new Date(`${str}T12:00:00`);

  const addDays = (date, days) => {
    const d = parseDate(date);
    d.setDate(d.getDate() + days);
    return localDate(d);
  };

  const startWeek = (date) => {
    const d = parseDate(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return localDate(d);
  };

  const formatDate = (
    date,
    options = {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ) => parseDate(date).toLocaleDateString("en-US", options);

  const safe = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const rate = (value) => (value === null ? "—" : `${value.toFixed(2)}%`);

  const sorted = (items) =>
    [...items].sort((a, b) =>
      `${b.date}T${b.time || "00:00"}`.localeCompare(
        `${a.date}T${a.time || "00:00"}`,
      ),
    );

  const outcomeName = {
    TP: "TP · Win",
    SL: "SL · Loss",
    BE: "Break even",
    OPEN: "Open",
  };

  const CANDLES = {
    1: {
      label: "1st 4H Candle",
      time: "16:00",
    },
    2: {
      label: "2nd 4H Candle",
      time: "20:00",
    },
  };

  const strategyName = (n) => CANDLES[String(n)]?.label || "4H Candle";

  const strategyLabel = strategyName;

  const cleanImage = (value) =>
    typeof value === "string" &&
    (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value) ||
      /^\/api\/trades\/[a-f0-9-]{36}\/image$/i.test(value))
      ? value
      : "";

  const num = (v) =>
    v === "" || v === null || v === undefined || !Number.isFinite(Number(v))
      ? null
      : Number(v);

  const validDate = (v) =>
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(parseDate(v).getTime()) &&
    localDate(parseDate(v)) === v;

  const state = {
    trades: [],
    view: "dashboard",
    image: "",
    imageBusy: false,
    week: today(),
    month: today().slice(0, 7),
    year: new Date().getFullYear(),
    selectedDay: null,
  };

  let toastTimer;

  function normalizeTrade(t) {
    if (!t || !validDate(t.date) || !["1", "2"].includes(String(t.strategy))) {
      return null;
    }

    return {
      id: String(t.id || `${Date.now()}-${Math.random()}`),
      date: t.date,
      time: CANDLES[String(t.strategy)].time,
      strategy: String(t.strategy),
      symbol: String(t.symbol || "Unknown").slice(0, 30),
      direction: ["LONG", "SHORT"].includes(t.direction) ? t.direction : "LONG",
      result: ["TP", "SL", "BE", "OPEN"].includes(t.result) ? t.result : "OPEN",
      session: "New York",
      rr: num(t.rr),
      entry: num(t.entry),
      tp: num(t.tp),
      sl: num(t.sl),
      pnl: num(t.pnl),
      notes: String(t.notes || "").slice(0, 5000),
      review: String(t.review || "").slice(0, 5000),
      image: cleanImage(t.image),
      createdAt: String(t.createdAt || new Date().toISOString()),
    };
  }

  async function request(path, options = {}) {
    let response;

    try {
      response = await fetch(API + path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        cache: "no-store",
      });
    } catch (error) {
      throw new Error(
        "Cannot reach the backend. Run npm start in the backend folder.",
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status}).`);
    }

    return data;
  }

  async function load() {
    try {
      const data = await request("/trades");

      state.trades = data.trades.map(normalizeTrade).filter(Boolean);

      render();
      return true;
    } catch (error) {
      console.error("Could not load trades:", error);
      notify(error.message);
      return false;
    }
  }

  function notify(message) {
    const el = $("#toast");

    el.textContent = message;
    el.classList.remove("hidden");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => el.classList.add("hidden"), 4600);
  }

  function stats(trades) {
    const tp = trades.filter((t) => t.result === "TP").length;

    const sl = trades.filter((t) => t.result === "SL").length;

    const be = trades.filter((t) => t.result === "BE").length;

    const open = trades.filter((t) => t.result === "OPEN").length;

    return {
      total: trades.length,
      tp,
      sl,
      be,
      open,
      completed: tp + sl,
      winRate: tp + sl ? (tp / (tp + sl)) * 100 : null,
    };
  }

  const byStrategy = (trades, n) =>
    trades.filter((t) => t.strategy === String(n));

  const empty = (title, detail) =>
    `<div class="empty">
      <strong>${safe(title)}</strong>
      <span>${safe(detail)}</span>
    </div>`;

  const strategyPill = (n) =>
    `<span
      class="strategy-chip ${String(n) === "2" ? "s2" : ""}"
      title="${safe(strategyLabel(n))}"
    >${safe(strategyName(n))}</span>`;

  const resultPill = (v) =>
    `<span class="status-chip ${v.toLowerCase()}">
      ${safe(outcomeName[v] || v)}
    </span>`;

  const imagePart = (t, cls = "trade-image") =>
    `<div class="${cls}">
      ${
        t.image
          ? `<img src="${t.image}" alt="Screenshot of ${safe(t.symbol)} trade">`
          : "▧"
      }
    </div>`;

  function openView(name) {
    if (!$("#view-" + name)) return;

    state.view = name;

    $$(".view").forEach((el) =>
      el.classList.toggle("active", el.id === "view-" + name),
    );

    $$(".nav-link").forEach((el) =>
      el.classList.toggle("active", el.dataset.view === name),
    );

    $("#breadcrumb").textContent = {
      dashboard: "Dashboard",
      add: "Log a trade",
      history: "Trade history",
      weekly: "Weekly review",
      monthly: "Monthly review",
      yearly: "Yearly review",
      backup: "Backup & restore",
    }[name];

    $("#sidebar").classList.remove("open");
    $("#navBackdrop").classList.remove("show");

    if (name === "add") resetForm();

    render();
    window.scrollTo(0, 0);
  }

  function statCard(label, value, detail, symbol, tone = "") {
    return `
      <div class="stat-card">
        <div class="stat-top">
          <span>${safe(label)}</span>
          <span class="stat-icon ${tone}">${symbol}</span>
        </div>

        <strong class="stat-value ${tone}">
          ${safe(value)}
        </strong>

        <small>${safe(detail)}</small>
      </div>
    `;
  }

  function comparisonCard(n, trades) {
    const s = stats(byStrategy(trades, n));

    return `
      <div class="panel strategy-card ${n === 2 ? "strategy-two" : ""}">
        <div class="strategy-heading">
          <span class="strategy-name">
            ${safe(strategyName(n))}
          </span>
          ${strategyPill(String(n))}
        </div>

        <div class="strategy-metric">
          ${rate(s.winRate)} <span>win rate</span>
        </div>

        <div class="meter">
          <div class="meter-fill" style="width:${s.winRate ?? 0}%"></div>
        </div>

        <div class="metrics-inline">
          <span>Trades <b>${s.total}</b></span>
          <span>TP <b class="positive">${s.tp}</b></span>
          <span>SL <b class="negative">${s.sl}</b></span>
          <span>BE / Open <b>${s.be + s.open}</b></span>
        </div>
      </div>
    `;
  }

  function tradeCard(t) {
    return `
      <article class="trade-card">
        ${imagePart(t)}

        <div class="trade-card-body">
          <div class="trade-meta">
            ${strategyPill(t.strategy)}
            <span>${safe(formatDate(t.date))}</span>
          </div>

          <div class="trade-title">
            ${safe(t.symbol)}
            <small>${safe(t.direction)}</small>
          </div>

          <div class="trade-footer">
            ${resultPill(t.result)}
            <button
              class="text-link"
              type="button"
              data-action="detail"
              data-id="${safe(t.id)}"
            >
              View →
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function drawChart() {
    const rows = [];
    const now = new Date();

    for (let index = 7; index >= 0; index--) {
      const d = new Date(now.getFullYear(), now.getMonth() - index, 1);

      const month = localDate(d).slice(0, 7);

      const monthTrades = state.trades.filter((t) => t.date.startsWith(month));

      rows.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        a: stats(byStrategy(monthTrades, 1)).winRate,
        b: stats(byStrategy(monthTrades, 2)).winRate,
      });
    }

    if (rows.every((row) => row.a === null && row.b === null)) {
      $("#trend-chart").innerHTML = empty(
        "No completed trades yet",
        "Log a TP or SL to see your win-rate trend.",
      );

      return;
    }

    const W = 680;
    const H = 248;
    const x0 = 48;
    const y0 = 20;
    const w = 610;
    const h = 175;

    const lines = [0, 25, 50, 75, 100]
      .map((v) => {
        const y = y0 + h - (v / 100) * h;

        return `
          <line
            x1="${x0}"
            y1="${y}"
            x2="${x0 + w}"
            y2="${y}"
            stroke="#323a49"
            stroke-dasharray="4 5"
          />
          <text class="axis" x="4" y="${y + 4}">${v}%</text>
        `;
      })
      .join("");

    const labels = rows
      .map(
        (r, i) => `
      <text
        class="axis"
        text-anchor="middle"
        x="${x0 + (i * w) / 7}"
        y="${y0 + h + 28}"
      >${r.label}</text>
    `,
      )
      .join("");

    function series(key, color) {
      let path = "";
      let lastExists = false;
      let dots = "";

      rows.forEach((r, i) => {
        if (r[key] === null) {
          lastExists = false;
          return;
        }

        const x = x0 + (i * w) / 7;
        const y = y0 + h - (r[key] / 100) * h;

        path += `${lastExists ? " L" : " M"}${x.toFixed(1)},${y.toFixed(1)}`;

        dots += `
          <circle
            cx="${x}"
            cy="${y}"
            r="4"
            fill="${color}"
          >
            <title>
              ${r.label}: ${rate(r[key])}
            </title>
          </circle>
        `;

        lastExists = true;
      });

      return `
        <path
          d="${path}"
          fill="none"
          stroke="${color}"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        ${dots}
      `;
    }

    $("#trend-chart").innerHTML = `
      <svg
        viewBox="0 0 ${W} ${H}"
        role="img"
        aria-label="Monthly win rate for 1st and 2nd 4H candles"
      >
        ${lines}
        ${labels}
        ${series("a", "#65d9a2")}
        ${series("b", "#a5a0ff")}
      </svg>
    `;
  }

  function renderDashboard() {
    const all = stats(state.trades);

    $("#overall-meta").textContent =
      `${all.total} total · ${all.completed} completed`;

    $("#overall-stats").innerHTML = [
      statCard(
        "Win rate",
        rate(all.winRate),
        `${all.tp} wins / ${all.completed} completed`,
        "◎",
        "positive",
      ),
      statCard("Take profit", all.tp, "Winning trades", "↗", "positive"),
      statCard("Stop loss", all.sl, "Losing trades", "↘", "negative"),
      statCard(
        "Total trades",
        all.total,
        `${all.be} BE · ${all.open} open`,
        "▤",
      ),
    ].join("");

    $("#strategy-comparison").innerHTML =
      comparisonCard(1, state.trades) + comparisonCard(2, state.trades);

    drawChart();

    const start = startWeek(today());
    const end = addDays(start, 6);

    const weekly = state.trades.filter((t) => t.date >= start && t.date <= end);

    const s = stats(weekly);

    $("#this-week-panel").innerHTML = `
      <div class="panel-heading">
        <div>
          <h2>This week</h2>
          <p>
            ${safe(formatDate(start))} –
            ${safe(formatDate(end))}
          </p>
        </div>
        <span>↗</span>
      </div>

      <div class="week-highlight">
        ${rate(s.winRate)}
      </div>

      <div class="week-label">
        Combined win rate
      </div>

      <div class="mini-row">
        <span>${safe(strategyName(1))}</span>
        <strong>
          ${rate(stats(byStrategy(weekly, 1)).winRate)}
        </strong>
      </div>

      <div class="mini-row">
        <span>${safe(strategyName(2))}</span>
        <strong>
          ${rate(stats(byStrategy(weekly, 2)).winRate)}
        </strong>
      </div>

      <div class="mini-row">
        <span>TP / SL</span>
        <strong>${s.tp} / ${s.sl}</strong>
      </div>

      <div class="week-panel-actions">
        <button
          class="btn btn-outline btn-wide"
          type="button"
          data-view="weekly"
        >
          View weekly review →
        </button>
      </div>
    `;

    const recent = sorted(state.trades).slice(0, 6);

    $("#recent-trades").innerHTML = recent.length
      ? recent.map(tradeCard).join("")
      : empty(
          "No trades recorded yet",
          "Add the 1st or 2nd 4H candle to begin.",
        );
  }

  function filteredHistory() {
    const search = $("#history-search").value.trim().toLowerCase();

    const st = $("#history-strategy").value;
    const result = $("#history-result").value;

    return sorted(state.trades).filter(
      (t) =>
        (st === "ALL" || t.strategy === st) &&
        (result === "ALL" || t.result === result) &&
        (!search ||
          [
            t.symbol,
            t.notes,
            t.review,
            t.session,
            t.date,
            strategyName(t.strategy),
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)),
    );
  }

  function renderHistory() {
    const trades = filteredHistory();

    $("#history-count").textContent =
      `${trades.length} record${trades.length !== 1 ? "s" : ""}`;

    $("#history-list").innerHTML = trades.length
      ? trades
          .map(
            (t) => `
        <div class="history-row">
          ${imagePart(t, "history-thumb")}

          <div class="history-primary">
            <strong>
              ${safe(t.symbol)} ·
              ${safe(t.direction)}
            </strong>

            <small>
              ${safe(formatDate(t.date))} ·
              ${safe(strategyLabel(t.strategy))}
            </small>
          </div>

          <div class="history-secondary">
            ${safe(t.session)}
            <strong>
              ${t.rr === null ? "" : ` · R:R 1:${safe(t.rr)}`}
            </strong>
          </div>

          ${resultPill(t.result)}

          <div class="history-actions">
            <button
              class="btn btn-outline"
              type="button"
              data-action="detail"
              data-id="${safe(t.id)}"
            >View</button>

            <button
              class="btn btn-outline"
              type="button"
              data-action="edit"
              data-id="${safe(t.id)}"
            >Edit</button>

            <button
              class="btn btn-danger"
              type="button"
              data-action="delete"
              data-id="${safe(t.id)}"
            >Delete</button>
          </div>
        </div>
      `,
          )
          .join("")
      : empty("No matching trades", "Try another filter or add a trade.");
  }

  function summaryBlocks(trades) {
    const all = stats(trades);
    const a = stats(byStrategy(trades, 1));
    const b = stats(byStrategy(trades, 2));

    const box = (label, s) => `
      <div class="summary-card">
        <span class="label">${label}</span>
        <div class="big">${rate(s.winRate)}</div>
        <p>
          ${s.total} trades ·
          ${s.tp} TP ·
          ${s.sl} SL ·
          ${s.be} BE ·
          ${s.open} open
        </p>
      </div>
    `;

    return `
      <div class="summary-pair">
        ${box("Combined", all)}
        ${box(safe(strategyLabel(1)), a)}
        ${box(safe(strategyLabel(2)), b)}
      </div>
    `;
  }

  function slot(date, n) {
    const t = state.trades.find(
      (x) => x.date === date && x.strategy === String(n),
    );

    if (!t) {
      return `
        <div class="slot slot-empty">
          <span>
            ${safe(strategyLabel(n))} · No entry
          </span>

          <button
            type="button"
            class="text-link"
            data-action="new-slot"
            data-date="${date}"
            data-strategy="${n}"
          >
            ＋ Add
          </button>
        </div>
      `;
    }

    return `
      <div class="slot">
        ${imagePart(t, "slot-image")}

        <div class="slot-body">
          <strong>
            ${safe(t.symbol)} ·
            ${safe(strategyName(n))}
          </strong>

          <small>
            ${safe(t.direction)} ·
            ${safe(outcomeName[t.result])}
            ${t.rr !== null ? ` · R:R 1:${safe(t.rr)}` : ""}
          </small>
        </div>

        <button
          class="text-link"
          type="button"
          data-action="detail"
          data-id="${safe(t.id)}"
        >
          View
        </button>
      </div>
    `;
  }

  function dayBlock(date) {
    const trades = state.trades.filter((t) => t.date === date);

    const s = stats(trades);

    return `
      <div class="day-panel">
        <div class="day-heading">
          <h3>
            ${safe(
              formatDate(date, {
                weekday: "long",
                month: "short",
                day: "numeric",
              }),
            )}
          </h3>

          <span>
            ${trades.length}/2 logged ·
            ${s.completed ? rate(s.winRate) : "No completed results"}
          </span>
        </div>

        <div class="day-trades">
          ${slot(date, 1)}
          ${slot(date, 2)}
        </div>
      </div>
    `;
  }

  function renderWeekly() {
    $("#week-picker").value = state.week;

    const start = startWeek(state.week);
    const end = addDays(start, 6);

    const trades = state.trades.filter((t) => t.date >= start && t.date <= end);

    $("#weekly-summary").innerHTML = summaryBlocks(trades);

    $("#weekly-days").innerHTML = Array.from({ length: 7 }, (_, i) =>
      dayBlock(addDays(start, i)),
    ).join("");
  }

  function renderMonthly() {
    $("#month-picker").value = state.month;

    const trades = state.trades.filter((t) => t.date.startsWith(state.month));

    $("#monthly-summary").innerHTML = summaryBlocks(trades);

    const [year, month] = state.month.split("-").map(Number);

    const days = new Date(year, month, 0).getDate();

    const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;

    $("#calendar-title").textContent = new Date(
      year,
      month - 1,
      1,
    ).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      .map((d) => `<div class="calendar-header">${d}</div>`)
      .join("");

    html += Array.from({ length: offset }, () => "<span></span>").join("");

    for (let day = 1; day <= days; day++) {
      const date = `${state.month}-${String(day).padStart(2, "0")}`;

      const t1 = trades.find((t) => t.date === date && t.strategy === "1");

      const t2 = trades.find((t) => t.date === date && t.strategy === "2");

      const marker = (n, t) =>
        t
          ? `<div class="calendar-dot ${t.result.toLowerCase()}">
               ● ${n === 1 ? "1st" : "2nd"} ${t.result}
             </div>`
          : "";

      html += `
        <button
          class="calendar-day
            ${date === today() ? "today" : ""}
            ${state.selectedDay === date ? "selected" : ""}"
          type="button"
          data-action="select-day"
          data-date="${date}"
        >
          <span>${day}</span>
          ${marker(1, t1)}
          ${marker(2, t2)}
        </button>
      `;
    }

    $("#calendar").innerHTML = html;

    const dayDates = [...new Set(trades.map((t) => t.date))].sort().reverse();

    $("#monthly-gallery").innerHTML = dayDates.length
      ? dayDates
          .filter((d) => !state.selectedDay || state.selectedDay === d)
          .map(dayBlock)
          .join("")
      : empty(
          "No trades this month",
          "Choose a different month or log a trade.",
        );

    if (state.selectedDay) {
      $("#monthly-gallery").innerHTML = dayBlock(state.selectedDay);
    }
  }

  function renderYearly() {
    $("#year-picker").value = state.year;

    const trades = state.trades.filter((t) =>
      t.date.startsWith(String(state.year) + "-"),
    );

    $("#yearly-summary").innerHTML = summaryBlocks(trades);

    $("#yearly-months").innerHTML = Array.from({ length: 12 }, (_, i) => {
      const prefix = `${state.year}-${String(i + 1).padStart(2, "0")}`;

      const monthTrades = state.trades.filter((t) => t.date.startsWith(prefix));

      const monthly = stats(monthTrades);
      const a = stats(byStrategy(monthTrades, 1));
      const b = stats(byStrategy(monthTrades, 2));

      const name = new Date(state.year, i, 1).toLocaleDateString("en-US", {
        month: "long",
      });

      return `
          <button
            type="button"
            class="year-card"
            data-action="open-month"
            data-month="${prefix}"
          >
            <h3>${name}</h3>

            <div class="rate">
              ${rate(monthly.winRate)}
            </div>

            <div class="row">
              <span>Total · TP / SL</span>
              <strong>
                ${monthly.total} ·
                ${monthly.tp} / ${monthly.sl}
              </strong>
            </div>

            <div class="row">
              <span>${safe(strategyName(1))}</span>
              <strong>${rate(a.winRate)}</strong>
            </div>

            <div class="row">
              <span>${safe(strategyName(2))}</span>
              <strong>${rate(b.winRate)}</strong>
            </div>
          </button>
        `;
    }).join("");
  }

  function renderBackup() {
    $("#storage-usage").textContent =
      `${state.trades.length} trades saved in MySQL. Screenshots are stored in the database too.`;
  }

  function render() {
    if (state.view === "dashboard") renderDashboard();
    if (state.view === "history") renderHistory();
    if (state.view === "weekly") renderWeekly();
    if (state.view === "monthly") renderMonthly();
    if (state.view === "yearly") renderYearly();
    if (state.view === "backup") renderBackup();
  }

  function inputValue(id) {
    return $("#" + id).value.trim();
  }

  function setValue(id, value) {
    $("#" + id).value = value ?? "";
  }

  function resetForm() {
    $("#trade-form").reset();
    $("#trade-id").value = "";
    $("#form-heading").textContent = "Log a trade";

    setValue("trade-date", today());
    setValue("trade-session", "New York");

    $("#trade-symbol")
      .querySelectorAll("option[data-legacy]")
      .forEach((option) => option.remove());

    state.image = "";
    state.imageBusy = false;
    $("#trade-image").value = "";

    previewImage();

    $("#save-button").textContent = "Save trade";
  }

  function previewImage() {
    $("#image-preview-wrap").classList.toggle("hidden", !state.image);

    $("#image-preview").src = state.image || "";
  }

  async function compressScreenshot(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw Error("Please choose a JPG, PNG, or WebP image.");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw Error("Maximum original image size is 10 MB.");
    }

    const url = URL.createObjectURL(file);

    try {
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;

        img.onerror = () => reject(Error("Image could not be read."));

        img.src = url;
      });

      const canvas = document.createElement("canvas");

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw Error("Image compression is not supported in this browser.");
      }

      let data = "";

      for (const maxWidth of [1200, 950, 720, 520]) {
        const scale = Math.min(1, maxWidth / img.width, maxWidth / img.height);

        canvas.width = Math.max(1, Math.round(img.width * scale));

        canvas.height = Math.max(1, Math.round(img.height * scale));

        ctx.fillStyle = "#fff";

        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        data = canvas.toDataURL("image/webp", 0.63);

        if (data.length <= 240000) {
          break;
        }
      }

      if (!cleanImage(data)) {
        throw Error("Unable to compress the screenshot.");
      }

      return data;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handleImage(event) {
    const file = event.target.files[0];

    if (!file) return;

    state.imageBusy = true;

    $("#save-button").disabled = true;
    $("#save-button").textContent = "Compressing image...";

    try {
      state.image = await compressScreenshot(file);

      previewImage();
      notify("Screenshot ready to save.");
    } catch (error) {
      notify(error.message);
      event.target.value = "";
    } finally {
      state.imageBusy = false;

      $("#save-button").disabled = false;
      $("#save-button").textContent = $("#trade-id").value
        ? "Update trade"
        : "Save trade";
    }
  }

  function editTrade(id) {
    const t = state.trades.find((x) => x.id === id);

    if (!t) return;

    openView("add");

    $("#trade-id").value = t.id;

    const pairSelect = $("#trade-symbol");

    if (![...pairSelect.options].some((option) => option.value === t.symbol)) {
      const legacy = document.createElement("option");

      legacy.value = t.symbol;
      legacy.textContent = `${t.symbol} (previous entry)`;

      legacy.dataset.legacy = "true";
      pairSelect.appendChild(legacy);
    }

    const fields = {
      date: t.date,
      strategy: t.strategy,
      symbol: t.symbol,
      direction: t.direction,
      result: t.result,
      rr: t.rr,
      notes: t.notes,
      review: t.review,
    };

    for (const [field, value] of Object.entries(fields)) {
      setValue("trade-" + field, value);
    }

    setValue("trade-session", "New York");

    state.image = t.image;
    previewImage();

    $("#form-heading").textContent = "Edit trade";
    $("#save-button").textContent = "Update trade";

    $("#trade-dialog").close();
  }

  async function saveTrade(event) {
    event.preventDefault();

    if (state.imageBusy) return;

    const id = inputValue("trade-id");
    const date = inputValue("trade-date");
    const strategy = inputValue("trade-strategy");

    if (!validDate(date)) {
      return notify("Choose a valid trade date.");
    }

    const duplicate = state.trades.find(
      (t) => t.date === date && t.strategy === strategy && t.id !== id,
    );

    if (duplicate) {
      return notify(
        `${strategyLabel(strategy)} already has an entry on ${date}. Edit that entry instead.`,
      );
    }

    const payload = {
      date,
      strategy,
      symbol: inputValue("trade-symbol").toUpperCase(),
      direction: inputValue("trade-direction"),
      result: inputValue("trade-result"),
      rr: inputValue("trade-rr"),
      notes: inputValue("trade-notes"),
      review: inputValue("trade-review"),

      imageAction: state.image
        ? state.image.startsWith("data:")
          ? "replace"
          : "keep"
        : "remove",
    };

    if (!payload.symbol) {
      return notify("Please select a pair.");
    }

    if (payload.imageAction === "replace") {
      payload.image = state.image;
    }

    if (!id && payload.imageAction === "keep") {
      payload.imageAction = "remove";
    }

    const button = $("#save-button");

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      await request(id ? `/trades/${encodeURIComponent(id)}` : "/trades", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (await load()) {
        resetForm();
        openView("history");

        notify(id ? "Trade updated in MySQL." : "Trade saved in MySQL.");
      }
    } catch (error) {
      notify(error.message);
    } finally {
      button.disabled = false;

      button.textContent = $("#trade-id").value ? "Update trade" : "Save trade";
    }
  }

  function tradeDetails(id) {
    const t = state.trades.find((x) => x.id === id);

    if (!t) return;

    const fields = {
      Date: formatDate(t.date),
      Candle: strategyLabel(t.strategy),
      Instrument: t.symbol,
      Direction: t.direction,
      Result: outcomeName[t.result],
      Session: "New York",
      "Risk : Reward": t.rr === null ? "—" : `1:${t.rr}`,
    };

    $("#dialog-content").innerHTML = `
      <p class="eyebrow">TRADE RECORD</p>

      <h1>
        ${safe(t.symbol)} ·
        ${safe(strategyLabel(t.strategy))}
      </h1>

      <div>${resultPill(t.result)}</div>

      ${
        t.image
          ? `<img
               class="dialog-img"
               src="${t.image}"
               alt="Chart screenshot"
             >`
          : empty("No screenshot", "This trade has no saved chart image.")
      }

      <div class="dialog-details">
        ${Object.entries(fields)
          .map(
            ([k, v]) => `
              <div>
                <b>${safe(k)}</b>
                ${safe(v)}
              </div>
            `,
          )
          .join("")}
      </div>

      <h2>Trade notes</h2>
      <p class="dialog-notes">
        ${safe(t.notes || "No notes provided.")}
      </p>

      <h2>Lessons learned</h2>
      <p class="dialog-notes">
        ${safe(t.review || "No review provided.")}
      </p>

      <div class="dialog-buttons">
        <button
          class="btn btn-primary"
          type="button"
          data-action="edit"
          data-id="${safe(t.id)}"
        >
          Edit trade
        </button>

        <button
          class="btn btn-danger"
          type="button"
          data-action="delete"
          data-id="${safe(t.id)}"
        >
          Delete trade
        </button>
      </div>
    `;

    $("#trade-dialog").showModal();
  }

  async function deleteTrade(id) {
    const t = state.trades.find((x) => x.id === id);

    if (!t) return;

    if (
      !confirm(`Delete ${strategyLabel(t.strategy)} on ${t.date} from MySQL?`)
    ) {
      return;
    }

    try {
      await request(`/trades/${encodeURIComponent(id)}`, { method: "DELETE" });

      if ($("#trade-dialog").open) {
        $("#trade-dialog").close();
      }

      await load();

      notify("Trade deleted from MySQL.");
    } catch (error) {
      notify(error.message);
    }
  }

  function csvCell(v) {
    let value = String(v ?? "");

    if (/^[=+@\-\t\r]/.test(value)) {
      value = "'" + value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  function download(filename, contents, mime) {
    const blob = new Blob([contents], { type: mime });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCsv() {
    const columns = [
      "date",
      "candle",
      "symbol",
      "direction",
      "result",
      "session",
      "rr",
      "notes",
      "review",
    ];

    const lines = [
      columns.join(","),
      ...filteredHistory().map((t) =>
        columns
          .map((k) => csvCell(k === "candle" ? strategyName(t.strategy) : t[k]))
          .join(","),
      ),
    ];

    download(
      `TradeLog-history-${today()}.csv`,
      "\ufeff" + lines.join("\r\n"),
      "text/csv;charset=utf-8",
    );
  }

  async function exportJson() {
    try {
      const backup = await request("/backup");

      download(
        `TradeLog-MySQL-backup-${today()}.json`,
        JSON.stringify(backup, null, 2),
        "application/json",
      );

      notify("Database backup downloaded.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function importJson(event) {
    const file = event.target.files[0];

    if (!file) return;

    try {
      if (file.size > 30 * 1024 * 1024) {
        throw Error("Backup file is too large (30 MB maximum).");
      }

      const raw = JSON.parse(await file.text());

      const valid =
        (raw.app === "TradeLog MySQL" && raw.version === 3) ||
        (raw.app === "TradeLog Local" && raw.version === 2);

      if (!valid || !Array.isArray(raw.trades)) {
        throw Error("Choose a valid TradeLog JSON backup.");
      }

      if (
        !confirm(
          `Replace the current ${state.trades.length} MySQL records with ${raw.trades.length} backup records?`,
        )
      ) {
        return;
      }

      const result = await request("/restore", {
        method: "POST",
        body: JSON.stringify(raw),
      });

      await load();

      notify(`${result.count} trades restored to MySQL.`);
    } catch (error) {
      notify(error.message || "Could not restore backup.");
    } finally {
      event.target.value = "";
    }
  }

  function monthMove(n) {
    const [y, m] = state.month.split("-").map(Number);

    state.month = localDate(new Date(y, m - 1 + n, 1)).slice(0, 7);

    state.selectedDay = null;
    render();
  }

  function clickAction(event) {
    const nav = event.target.closest("[data-view]");

    if (nav) {
      openView(nav.dataset.view);
      return;
    }

    const action = event.target.closest("[data-action]");

    if (!action) return;

    const { action: kind, id, date, strategy, month } = action.dataset;

    if (kind === "detail") tradeDetails(id);
    if (kind === "edit") editTrade(id);
    if (kind === "delete") deleteTrade(id);

    if (kind === "new-slot") {
      openView("add");

      setValue("trade-date", date);
      setValue("trade-strategy", strategy);
    }

    if (kind === "select-day") {
      state.selectedDay = state.selectedDay === date ? null : date;

      renderMonthly();
    }

    if (kind === "open-month") {
      state.month = month;
      state.selectedDay = null;
      openView("monthly");
    }
  }

  function init() {
    resetForm();
    load();

    document.addEventListener("click", clickAction);

    $("#trade-form").addEventListener("submit", saveTrade);

    $("#trade-image").addEventListener("change", handleImage);

    $("#remove-image").addEventListener("click", () => {
      state.image = "";
      $("#trade-image").value = "";
      previewImage();
    });

    $("#history-search").addEventListener("input", renderHistory);

    $("#history-strategy").addEventListener("change", renderHistory);

    $("#history-result").addEventListener("change", renderHistory);

    $("#week-picker").addEventListener("change", (e) => {
      if (validDate(e.target.value)) {
        state.week = e.target.value;
        renderWeekly();
      }
    });

    $("#week-prev").addEventListener("click", () => {
      state.week = addDays(state.week, -7);
      renderWeekly();
    });

    $("#week-next").addEventListener("click", () => {
      state.week = addDays(state.week, 7);
      renderWeekly();
    });

    $("#month-picker").addEventListener("change", (e) => {
      if (/^\d{4}-\d{2}$/.test(e.target.value)) {
        state.month = e.target.value;
        state.selectedDay = null;
        renderMonthly();
      }
    });

    $("#month-prev").addEventListener("click", () => monthMove(-1));

    $("#month-next").addEventListener("click", () => monthMove(1));

    $("#year-picker").addEventListener("change", (e) => {
      const n = Number(e.target.value);

      if (n >= 2000 && n <= 2100) {
        state.year = n;
        renderYearly();
      }
    });

    $("#year-prev").addEventListener("click", () => {
      if (state.year > 2000) {
        state.year--;
        renderYearly();
      }
    });

    $("#year-next").addEventListener("click", () => {
      if (state.year < 2100) {
        state.year++;
        renderYearly();
      }
    });

    $("#export-csv").addEventListener("click", exportCsv);

    $("#export-json").addEventListener("click", exportJson);

    $("#import-json").addEventListener("change", importJson);

    $("#clear-data").addEventListener("click", async () => {
      if (
        !confirm(
          "Delete ALL trades and screenshots from MySQL? Download a backup first.",
        )
      ) {
        return;
      }

      if (
        !confirm("This cannot be undone without a backup. Delete everything?")
      ) {
        return;
      }

      try {
        await request("/trades", {
          method: "DELETE",
        });

        await load();

        notify("All MySQL trades deleted.");
      } catch (error) {
        notify(error.message);
      }
    });

    $("#menuToggle").addEventListener("click", () => {
      $("#sidebar").classList.add("open");
      $("#navBackdrop").classList.add("show");
    });

    $("#navBackdrop").addEventListener("click", () => {
      $("#sidebar").classList.remove("open");
      $("#navBackdrop").classList.remove("show");
    });

    $("#close-dialog").addEventListener("click", () =>
      $("#trade-dialog").close(),
    );

    renderDashboard();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
