# TradeLog — Personal Trading Journal

A full-stack trading journal for saving chart screenshots, logging current or historical trades, calculating win rates automatically, and reviewing performance by week, month, and year.

## Features

- **Dashboard:** all-time win rate, TP/SL totals, current streak, monthly performance chart, and recent trade screenshots.
- **Add/Edit Trade:** upload a screenshot, select a historical date and time, record the instrument, long/short direction, TP/SL/BE/OPEN result, optional prices, risk-to-reward ratio, P/L, session, strategy, and notes.
- **Weekly review:** Monday–Sunday sections with individual day expand/collapse and screenshot cards for each trade.
- **Monthly review:** calendar with trade thumbnails, clickable dates, and a date-grouped screenshot gallery.
- **Yearly review:** 12 monthly cards with each month's rate and TP/SL counts.
- **Trade details:** full original screenshot, recorded information, notes, previous/next trade navigation, and optional AI screenshot review.
- **Trade history:** search and filter records, update or delete records, and export filtered rows to CSV.
- **Backend:** Express API, MySQL connection pool, MVC-style model/controller/routes, screenshot uploads, and error handling.

## Technology

- React + Vite
- Node.js + Express
- MySQL 8+
- `mysql2` promise driver
- React Router, Recharts, Lucide React, and Multer for screenshot uploads

> This version uses **MySQL**, not MongoDB. It is no longer a MERN/MongoDB project; the stack is React + Express + Node.js + MySQL.

## Requirements to install

1. **Node.js 20 or newer** (includes npm): https://nodejs.org/
2. **MySQL Server 8 or newer**: https://dev.mysql.com/downloads/mysql/
3. Optional but helpful: **MySQL Workbench** for running SQL visually: https://dev.mysql.com/downloads/workbench/

You do not need MongoDB or Mongoose.

## 1. Create the database and table

The SQL setup file is `backend/database/init.sql`. It creates the `trading_journal` database and the `trades` table, including indexes used by date, pair, and result filtering.

### Option A — MySQL Workbench

1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `backend/database/init.sql` (File → Open SQL Script).
3. Click the lightning-bolt **Execute** button.
4. Refresh the Schemas panel. You should see `trading_journal` → `Tables` → `trades`.

### Option B — MySQL command line

From the project root, run this in a terminal (Windows users can use MySQL Command Line Client if `mysql` is not on PATH):

```bash
mysql -u root -p < backend/database/init.sql
```

Enter the password you chose when installing MySQL. If your root account has no password, use `mysql -u root < backend/database/init.sql`.

### SQL included in the setup file

```sql
CREATE DATABASE IF NOT EXISTS trading_journal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE trading_journal;

CREATE TABLE IF NOT EXISTS trades (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  symbol VARCHAR(30) NOT NULL,
  direction ENUM('LONG', 'SHORT') NOT NULL,
  result ENUM('TP', 'SL', 'BE', 'OPEN') NOT NULL DEFAULT 'OPEN',
  trade_date DATETIME(3) NOT NULL,
  screenshot VARCHAR(255) NOT NULL,
  entry_price DECIMAL(20, 8) NULL,
  take_profit DECIMAL(20, 8) NULL,
  stop_loss DECIMAL(20, 8) NULL,
  risk_reward DECIMAL(8, 3) NULL,
  pnl DECIMAL(18, 4) NULL,
  strategy VARCHAR(100) NOT NULL DEFAULT '',
  session VARCHAR(50) NOT NULL DEFAULT '',
  notes TEXT NOT NULL,
  review TEXT NOT NULL,
  ai_review MEDIUMTEXT NULL,
  ai_review_model VARCHAR(100) NOT NULL DEFAULT '',
  ai_review_generated_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_trades_date (trade_date),
  INDEX idx_trades_symbol_result (symbol, result),
  INDEX idx_trades_date_result (trade_date, result)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## 2. Configure and start the backend

Open a terminal inside `TradingJournal/backend` and install the backend dependencies:

```bash
npm install
```

Copy `.env.example` to `.env`. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `backend/.env` and set the MySQL credentials you use on your computer:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=trading_journal
CLIENT_URL=http://localhost:5173
MAX_UPLOAD_MB=10
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Replace `your_mysql_password` with your actual MySQL password. If it is blank, leave `DB_PASSWORD=`. Do not share or commit your `.env` file.

Make sure the MySQL service is running, and that you have executed the SQL setup. Then run:

```bash
npm run dev
```

The backend API runs at `http://localhost:5000`. You can check it at `http://localhost:5000/api/health`; a working response looks like `{"status":"ok","service":"trading-journal-api"}`.

## 3. Start the frontend

Open a second terminal inside `TradingJournal/frontend` and run:

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`. The Vite development server proxies `/api` and `/uploads` requests to the backend, so `VITE_API_URL` can remain empty for local development.

## Win-rate rules

- TP counts as a win.
- SL counts as a loss.
- BE and OPEN are excluded from win rate until a final TP/SL result exists.
- Win rate = `TP / (TP + SL) × 100`.
- A period with no TP/SL trades displays `—` rather than 0%.
- Weekly reports run Monday to Sunday.
- Reports group by the selected trade date/time, not when the record was saved.
- Monthly and yearly win rates use the period's total TP and SL counts; they do not average smaller period percentages.

Example: 5 TP and 2 SL = 71.43%. Adding another week's 6 TP and 1 SL gives 11 TP and 3 SL overall = 78.57%.

## Optional AI screenshot review

The Trade Details page includes an **Analyze chart** button. To enable it, add your own key to `backend/.env`:

```env
OPENAI_API_KEY=your_private_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Restart the backend after changing `.env`. Each analysis sends the saved screenshot and relevant trade metadata to the configured OpenAI API; API usage may incur charges. The review is saved in MySQL and is intended for educational chart observations, not a guaranteed explanation of price movement or financial advice. Normal logging and statistics work without the optional API key. Keep the key private and never put it in the frontend environment file.

## API endpoints

- `GET /api/health` — check API status
- `GET /api/trades` — list records; supports `symbol`, `result`, `direction`, `from`, `to`, and `limit` query parameters
- `GET /api/trades/:id` — read one trade
- `POST /api/trades` — create a trade using `multipart/form-data` with the `screenshot` file field
- `PATCH /api/trades/:id` — update a trade; image replacement is optional
- `POST /api/trades/:id/analyze` — optional AI screenshot review
- `DELETE /api/trades/:id` — delete a trade and its stored screenshot

## Screenshot and data backup

Original images are saved in `backend/uploads`; MySQL stores each image path and its trade details. CSV export includes screenshot paths but not image binaries. Back up both the `trading_journal` MySQL database and the `backend/uploads` folder to preserve the complete journal.

To back up the database:

```bash
mysqldump -u root -p trading_journal > trading_journal_backup.sql
```

This version is designed for personal local use and does not include user accounts or cloud backups. Do not expose the backend publicly without adding authentication and authorization.

## Project structure

```text
TradingJournal/
├── README.md
├── backend/
│   ├── database/
│   │   └── init.sql
│   ├── uploads/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
└── frontend/
    └── src/
        ├── api/
        ├── components/
        ├── context/
        ├── pages/
        └── utils/
```
