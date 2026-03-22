const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { submitTicket, getMyTickets } = require('../controllers/supportController');

// User routes — protected
router.post('/', protect, submitTicket);
router.get('/my-tickets', protect, getMyTickets);

module.exports = router;
