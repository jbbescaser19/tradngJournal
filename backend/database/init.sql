-- TradeLog database setup
-- Run from the backend folder: mysql -u root -p < database/init.sql

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

SELECT 'TradeLog database and trades table are ready.' AS setup_status;
