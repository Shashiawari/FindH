const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { createBooking, mockPay, getMyBookingForListing } = require('../controllers/bookingController');

router.post('/create-checkout-session', protect, createBooking);
router.post('/mock-pay/:bookingId', protect, mockPay);
router.get('/my-booking/:listingId', protect, getMyBookingForListing);

module.exports = router;
