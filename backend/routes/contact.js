const express = require('express');
const router = express.Router();
const { submitContactQuery } = require('../controllers/contactController');

// Public — no auth required
router.post('/', submitContactQuery);

module.exports = router;
