const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/', (req, res) => {
db.query(`SELECT p.id, pr.nama, p.qty, p.total, p.status FROM pembelian p
JOIN produk pr ON p.produk_id = pr.id`, (err, purchases) => {
res.render('purchases', { purchases });
});
});


router.get('/add', (req, res) => {
db.query('SELECT * FROM produk', (err, products) => {
res.render('addPurchase', { products });
});
});


router.post('/add', (req, res) => {
const { produk_id, qty } = req.body;


db.query('SELECT harga FROM produk WHERE id=?', [produk_id], (err, result) => {
const total = result[0].harga * qty;


db.query('INSERT INTO pembelian SET ?', {
produk_id,
qty,
total,
status: 'SUCCESS'
});


db.query('UPDATE stock SET jumlah = jumlah - ? WHERE produk_id=?', [qty, produk_id]);


res.redirect('/purchases');
});
});


router.get('/cancel/:id', (req, res) => {
const id = req.params.id;


db.query('UPDATE pembelian SET status="CANCELED" WHERE id=?', [id]);


res.redirect('/purchases');
});


module.exports = router;
