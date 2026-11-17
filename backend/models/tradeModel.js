"use strict";

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "tradelog_db",
  connectionLimit: 5,
  waitForConnections: true,
  dateStrings: true,
  decimalNumbers: true,
});

const fields = `id, trade_date AS date, candle AS strategy,
  pair AS symbol, direction, result, rr, notes, review,
  (image_data IS NOT NULL) AS hasImage, created_at AS createdAt`;

function present(row) {
  return {
    id: row.id,
    date: row.date,
    strategy: String(row.strategy),
    time: Number(row.strategy) === 1 ? "16:00" : "20:00",
    symbol: row.symbol,
    direction: row.direction,
    result: row.result,
    session: "New York",
    rr: row.rr === null ? null : Number(row.rr),
    notes: row.notes,
    review: row.review,
    image: row.hasImage
      ? `/api/trades/${encodeURIComponent(row.id)}/image`
      : "",
    createdAt: row.createdAt,
  };
}

async function ping() {
  await pool.query("SELECT 1");
}

async function list() {
  const [rows] = await pool.query(
    `SELECT ${fields}
     FROM trades
     ORDER BY trade_date DESC, candle DESC`,
  );

  return rows.map(present);
}

async function get(id) {
  const [rows] = await pool.execute(
    `SELECT ${fields}
     FROM trades
     WHERE id = ?`,
    [id],
  );

  return rows.length ? present(rows[0]) : null;
}

async function image(id) {
  const [rows] = await pool.execute(
    "SELECT image_mime, image_data FROM trades WHERE id = ?",
    [id],
  );

  return rows[0] || null;
}

async function create(record, picture) {
  await pool.execute(
    `INSERT INTO trades
      (id, trade_date, candle, pair, direction, result,
       rr, notes, review, image_mime, image_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.date,
      record.strategy,
      record.symbol,
      record.direction,
      record.result,
      record.rr,
      record.notes,
      record.review,
      picture.mime,
      picture.data,
    ],
  );

  return get(record.id);
}

async function update(id, record, action, picture) {
  const values = [
    record.date,
    record.strategy,
    record.symbol,
    record.direction,
    record.result,
    record.rr,
    record.notes,
    record.review,
  ];

  if (action === "keep") {
    await pool.execute(
      `UPDATE trades
       SET trade_date=?, candle=?, pair=?, direction=?,
           result=?, rr=?, notes=?, review=?
       WHERE id=?`,
      [...values, id],
    );
  } else {
    await pool.execute(
      `UPDATE trades
       SET trade_date=?, candle=?, pair=?, direction=?,
           result=?, rr=?, notes=?, review=?,
           image_mime=?, image_data=?
       WHERE id=?`,
      [...values, picture.mime, picture.data, id],
    );
  }

  return get(id);
}

async function remove(id) {
  const [result] = await pool.execute("DELETE FROM trades WHERE id=?", [id]);

  return result.affectedRows > 0;
}

async function clear() {
  await pool.query("DELETE FROM trades");
}

async function backup() {
  const [rows] = await pool.query(
    `SELECT id, trade_date AS date, candle AS strategy,
      pair AS symbol, direction, result, rr,
      notes, review, image_mime, image_data,
      created_at AS createdAt
     FROM trades
     ORDER BY trade_date DESC, candle DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    strategy: String(row.strategy),
    symbol: row.symbol,
    direction: row.direction,
    result: row.result,
    rr: row.rr === null ? null : Number(row.rr),
    notes: row.notes,
    review: row.review,
    image: row.image_data
      ? `data:${row.image_mime};base64,${row.image_data.toString("base64")}`
      : "",
    createdAt: row.createdAt,
  }));
}

async function restore(records) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM trades");

    for (const item of records) {
      const { record, picture } = item;

      await conn.execute(
        `INSERT INTO trades
          (id, trade_date, candle, pair, direction, result,
           rr, notes, review, image_mime, image_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.date,
          record.strategy,
          record.symbol,
          record.direction,
          record.result,
          record.rr,
          record.notes,
          record.review,
          picture.mime,
          picture.data,
        ],
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  ping,
  list,
  get,
  image,
  create,
  update,
  remove,
  clear,
  backup,
  restore,
};
