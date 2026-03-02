const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middlewares/authMiddleware');

const {
    adminLogin,
    getPendingAgentsKYC, approveAgentKYC, rejectAgentKYC,
    getAllListings, updateListingStatus, deleteListing,
    getPropertyApplications, approvePropertyApp, rejectPropertyApp,
    getBookingStats
} = require('../controllers/adminController');

// Public
router.post('/login', adminLogin);

// ==========================================
// Protected Admin Routes (V3 Tabs)
// ==========================================

// TAB 1: KYC
router.get('/agents/kyc/pending', protectAdmin, getPendingAgentsKYC);
router.put('/agents/kyc/:id/approve', protectAdmin, approveAgentKYC);
router.post('/agents/kyc/:id/reject', protectAdmin, rejectAgentKYC);

// TAB 2: Listings
router.get('/listings', protectAdmin, getAllListings);
router.put('/listings/:id/status', protectAdmin, updateListingStatus);
router.delete('/listings/:id', protectAdmin, deleteListing);

// TAB 3: Agent Applications (Properties)
router.get('/properties/applications', protectAdmin, getPropertyApplications);
router.put('/properties/applications/:id/approve', protectAdmin, approvePropertyApp);
router.post('/properties/applications/:id/reject', protectAdmin, rejectPropertyApp);

// TAB 4: Bookings
router.get('/bookings/stats', protectAdmin, getBookingStats);

module.exports = router;