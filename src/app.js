require('dotenv').config();

const express = require('express');
const cors = require('cors');
const routes = require('./routes/routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    status: 0,
    message: 'Nutech API Test is running',
    data: null
  });
});

app.use(routes);

module.exports = app;