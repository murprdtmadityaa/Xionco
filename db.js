// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'db.sqlite');

const fs = require('fs');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function init() {
  // create tables
  await runAsync(`PRAGMA foreign_keys = ON;`);

  await runAsync(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL
  );`);

  await runAsync(`CREATE TABLE IF NOT EXISTS stocks (
    product_id INTEGER PRIMARY KEY,
    qty INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  );`);

  await runAsync(`CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    price_at_purchase INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    canceled INTEGER NOT NULL DEFAULT 0,
    canceled_at TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );`);

  const row = await allAsync(`SELECT COUNT(*) as c FROM products;`);
  const count = row[0].c;
  if (count === 0) {
    const products = [
      ['Buku Tulis A5', 5000],
      ['Pulpen Hitam', 3000],
      ['Pensil 2B', 2000],
      ['Penghapus', 1500],
      ['Spidol', 8000],
      ['Stapler', 12000],
      ['Kertas HVS A4 (pack)', 45000],
      ['Binder 20mm', 25000],
      ['Penggaris 30cm', 7000],
      ['Tinta Printer', 150000]
    ];
    for (const [name, price] of products) {
      await runAsync(`INSERT INTO products (name, price) VALUES (?, ?)`, [name, price]);
    }
    const productRows = await allAsync(`SELECT id FROM products`);
    for (const p of productRows) {
      const initQty = 50;
      await runAsync(`INSERT INTO stocks (product_id, qty) VALUES (?, ?)`, [p.id, initQty]);
    }
    console.log('Seeded 10 products and stocks.');
  }
}

module.exports = { db, runAsync, allAsync, init };
