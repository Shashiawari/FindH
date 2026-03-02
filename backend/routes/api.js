const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { createTenant, getAllTenants, getTenantById } = require('../controllers/tenantController');
const { createAgent, getPublicNearbyAgents, getPrivateNearbyAgents, getAgentById } = require('../controllers/agentController');
const { protect } = require('../middlewares/authMiddleware');

// ----------------------
// Tenant Routes
// ----------------------
const tenantUploads = upload.fields([
    { name: 'images', maxCount: 4 },
    { name: 'ownershipProof', maxCount: 1 },
    { name: 'rentalAgreement', maxCount: 1 },
    { name: 'electricityBill', maxCount: 1 }
]);

router.post('/tenants', protect, tenantUploads, createTenant);
router.get('/tenants', getAllTenants);
router.get('/tenants/:id', getTenantById);

// ----------------------
// Agent Routes
// ----------------------
const agentUploads = upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'studentCertificate', maxCount: 1 },
    { name: 'studentIDPhoto', maxCount: 1 }
]);

router.post('/agents', protect, agentUploads, createAgent);
router.get('/agents/public/nearby/:tenantId', getPublicNearbyAgents);
router.get('/agents/private/nearby/:tenantId', protect, getPrivateNearbyAgents);
router.get('/agents/:id', getAgentById);

module.exports = router;
