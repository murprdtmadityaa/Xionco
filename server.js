const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');


app.use('/products', require('./routes/productRoutes'));
app.use('/purchases', require('./routes/purchaseRoutes'));


app.get('/', (req, res) => {
res.redirect('/products');
});


app.listen(port, () => console.log(`Running at http://localhost:${port}`));
