const express = require('express');
const router = express.Router();
const { protectAdmin, protect } = require('../middlewares/authMiddleware');

const {
    adminLogin,
    // Dashboard
    getDashboardStats,
    // KYC
    getPendingAgentsKYC, approveAgentKYC, rejectAgentKYC,
    // Listings
    getAllListings, updateListingStatus, deleteListing,
    updateListingAdmin, featureListing, hideListing, verifyListing, unverifyListing,
    // Property Applications
    getPropertyApplications, approvePropertyApp, rejectPropertyApp, requestReuploadPropertyApp,
    // Booking Stats
    getBookingStats,
    // Users
    getAllUsers, getUserById, updateUser, suspendUser, deleteUser,
    // Verification Requests
    getVerificationRequests, updateVerificationStatus,
    // Payments
    getPayments, refundPayment,
    // Activity Log
    getActivityLog,
    // Global Search
    globalSearch,
    // Database Manager
    getDbTable, updateDbRecord, deleteDbRecord, exportTableCSV,
    // Platform Settings
    getPlatformSettings, updatePlatformSettings,
    // User-facing verification
    createVerificationRequest
} = require('../controllers/adminController');
const { getAllContactQueries } = require('../controllers/contactController');
const { getAllTickets } = require('../controllers/supportController');

// Public
router.post('/login', adminLogin);

// ==========================================
// User-facing: Verification Request
// ==========================================
router.post('/verification/request', protect, createVerificationRequest);

// ==========================================
// Protected Admin Routes
// ==========================================

// Dashboard Stats
router.get('/dashboard/stats', protectAdmin, getDashboardStats);

// KYC
router.get('/agents/kyc/pending', protectAdmin, getPendingAgentsKYC);
router.put('/agents/kyc/:id/approve', protectAdmin, approveAgentKYC);
router.post('/agents/kyc/:id/reject', protectAdmin, rejectAgentKYC);

// Listings
router.get('/listings', protectAdmin, getAllListings);
router.put('/listings/:id/status', protectAdmin, updateListingStatus);
router.put('/listings/:id/edit', protectAdmin, updateListingAdmin);
router.put('/listings/:id/feature', protectAdmin, featureListing);
router.put('/listings/:id/hide', protectAdmin, hideListing);
router.put('/listings/:id/verify', protectAdmin, verifyListing);
router.put('/listings/:id/unverify', protectAdmin, unverifyListing);
router.delete('/listings/:id', protectAdmin, deleteListing);

// Agent Property Applications
router.get('/properties/applications', protectAdmin, getPropertyApplications);
router.put('/properties/applications/:id/approve', protectAdmin, approvePropertyApp);
router.post('/properties/applications/:id/reject', protectAdmin, rejectPropertyApp);
router.post('/properties/applications/:id/reupload', protectAdmin, requestReuploadPropertyApp);

// Bookings
router.get('/bookings/stats', protectAdmin, getBookingStats);

// Contact Queries
router.get('/contact-queries', protectAdmin, getAllContactQueries);

// Support Tickets
router.get('/support-tickets', protectAdmin, getAllTickets);

// Users Management
router.get('/users', protectAdmin, getAllUsers);
router.get('/users/:id', protectAdmin, getUserById);
router.put('/users/:id', protectAdmin, updateUser);
router.put('/users/:id/suspend', protectAdmin, suspendUser);
router.delete('/users/:id', protectAdmin, deleteUser);

// Verification Requests
router.get('/verification-requests', protectAdmin, getVerificationRequests);
router.put('/verification-requests/:id/status', protectAdmin, updateVerificationStatus);

// Payments
router.get('/payments', protectAdmin, getPayments);
router.put('/payments/:id/refund', protectAdmin, refundPayment);

// Activity Log
router.get('/activity-log', protectAdmin, getActivityLog);

// Global Search
router.get('/search', protectAdmin, globalSearch);

// Database Manager
router.get('/db/:table', protectAdmin, getDbTable);
router.get('/db/:table/export', protectAdmin, exportTableCSV);
router.put('/db/:table/:id', protectAdmin, updateDbRecord);
router.delete('/db/:table/:id', protectAdmin, deleteDbRecord);

// Platform Settings / Emergency Mode
router.get('/settings', protectAdmin, getPlatformSettings);
router.put('/settings', protectAdmin, updatePlatformSettings);

module.exports = router;