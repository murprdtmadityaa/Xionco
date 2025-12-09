// server.js
const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const { db, runAsync, allAsync, init } = require('./db');

// 1️⃣ Buat app DULU sebelum app.set()
const app = express();
const PORT = process.env.PORT || 3000;

// 2️⃣ Setup EJS + Layouts
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');  // gunakan views/layout.ejs sebagai master layout

// 3️⃣ Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

// 4️⃣ Init DB lalu jalankan semua route
(async () => {
  try {
    await init();
  } catch (err) {
    console.error('DB init error', err);
    process.exit(1);
  }

  app.get('/', (req, res) => res.redirect('/admin/products'));

  // Products + stock
  app.get('/admin/products', async (req, res) => {
    const products = await allAsync(`
      SELECT p.id, p.name, p.price, IFNULL(s.qty,0) as qty
      FROM products p
      LEFT JOIN stocks s ON p.id = s.product_id
      ORDER BY p.id
    `);
    res.render('products', { products });
  });

  // form new purchase
  app.get('/admin/purchases/new', async (req, res) => {
    const products = await allAsync(`
      SELECT p.id, p.name, p.price, IFNULL(s.qty,0) as qty 
      FROM products p 
      LEFT JOIN stocks s 
      ON p.id = s.product_id
    `);
    res.render('new_purchase', { products, errors: [] });
  });

  // create purchase
  app.post('/admin/purchases', async (req, res) => {
    const product_id = parseInt(req.body.product_id);
    const qty = parseInt(req.body.qty);

    const errors = [];
    if (!product_id) errors.push('Pilih produk.');
    if (!qty || qty <= 0) errors.push('Jumlah harus > 0.');

    if (errors.length) {
      const products = await allAsync(`
        SELECT p.id, p.name, p.price, IFNULL(s.qty,0) as qty 
        FROM products p 
        LEFT JOIN stocks s 
        ON p.id = s.product_id
      `);
      return res.render('new_purchase', { products, errors });
    }

    try {
      await runAsync('BEGIN TRANSACTION;');

      const rows = await allAsync(`
        SELECT s.qty, p.price 
        FROM stocks s 
        JOIN products p ON s.product_id = p.id 
        WHERE product_id = ?
      `, [product_id]);

      if (!rows || rows.length === 0) throw new Error('Produk tidak ditemukan.');
      const currentQty = rows[0].qty;
      const price = rows[0].price;

      if (currentQty < qty) {
        throw new Error(`Stock tidak cukup. Stock tersedia: ${currentQty}`);
      }

      await runAsync(`
        INSERT INTO purchases (product_id, qty, price_at_purchase)
        VALUES (?, ?, ?)
      `, [product_id, qty, price]);

      await runAsync(`
        UPDATE stocks SET qty = qty - ? WHERE product_id = ?
      `, [qty, product_id]);

      await runAsync('COMMIT;');
      res.redirect('/admin/purchases');

    } catch (err) {
      await runAsync('ROLLBACK;');
      res.send("Gagal menyimpan pembelian: " + err.message);
    }
  });

  // list purchases
  app.get('/admin/purchases', async (req, res) => {
    const purchases = await allAsync(`
      SELECT pu.*, p.name as product_name
      FROM purchases pu
      JOIN products p ON pu.product_id = p.id
      ORDER BY pu.created_at DESC
    `);
    res.render('purchases', { purchases });
  });

  // cancel purchase
  app.post('/admin/purchases/:id/cancel', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
      await runAsync('BEGIN TRANSACTION;');

      const rows = await allAsync(`
        SELECT * FROM purchases WHERE id = ?
      `, [id]);

      if (!rows || rows.length === 0) throw new Error('Data pembelian tidak ditemukan.');

      const purchase = rows[0];
      if (purchase.canceled) throw new Error('Pembelian sudah dibatalkan.');

      await runAsync(`
        UPDATE stocks SET qty = qty + ? WHERE product_id = ?
      `, [purchase.qty, purchase.product_id]);

      await runAsync(`
        UPDATE purchases 
        SET canceled = 1, canceled_at = datetime('now','localtime') 
        WHERE id = ?
      `, [id]);

      await runAsync('COMMIT;');
      res.redirect('/admin/purchases');
    } catch (err) {
      await runAsync('ROLLBACK;');
      res.send("Gagal membatalkan pembelian: " + err.message);
    }
  });

  // Jalankan server
  app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
})();
