const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    createVerificationRequestAfterPayment,
    getAgentVerificationRequests,
    acceptVerificationRequest,
    rejectVerificationRequest,
    getMyVerificationRequests,
    getMyNotifications,
    getMyUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotification
} = require('../controllers/verificationController');

router.post('/request', protect, createVerificationRequestAfterPayment);
router.get('/my-requests', protect, getMyVerificationRequests);

router.get('/agent/requests', protect, getAgentVerificationRequests);
router.post('/agent/requests/:bookingId/accept', protect, acceptVerificationRequest);
router.post('/agent/requests/:bookingId/reject', protect, rejectVerificationRequest);

router.get('/notifications', protect, getMyNotifications);
router.get('/notifications/unread-count', protect, getMyUnreadNotificationCount);
router.put('/notifications/:notificationId/read', protect, markNotificationAsRead);
router.delete('/notifications/:notificationId', protect, deleteNotification);

module.exports = router;
