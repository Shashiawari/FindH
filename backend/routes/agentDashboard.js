const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getAgentStats, uploadListingDocuments } = require('../controllers/agentDashboardController');
const { protect } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Needs to be authenticated (protect attaches req.user)
router.get('/stats', protect, getAgentStats);

router.post('/upload-documents', protect, upload.fields([
    { name: 'propertyImages', maxCount: 10 },
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'ownershipProof', maxCount: 1 },
    { name: 'rentalAgreement', maxCount: 1 },
    { name: 'electricityBill', maxCount: 1 },
    { name: 'propertyRegistration', maxCount: 1 }
]), uploadListingDocuments);

module.exports = router;
