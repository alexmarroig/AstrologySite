const express = require('express');
const horoscopeController = require('../controllers/horoscope.controller');

const router = express.Router();

router.get('/daily', horoscopeController.getDaily);

module.exports = router;
