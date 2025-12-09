const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/', (req, res) => {
db.query('SELECT * FROM produk', (err, products) => {
res.render('products', { products });
});
});


router.get('/stock', (req, res) => {
db.query('SELECT * FROM stock', (err, stock) => {
res.render('stock', { stock });
});
});


module.exports = router;
