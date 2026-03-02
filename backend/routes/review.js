const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { createReview, getAgentReviews } = require('../controllers/reviewController');

router.post('/', protect, createReview);
router.get('/:agentId', getAgentReviews);

module.exports = router;
