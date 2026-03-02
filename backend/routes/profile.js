const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const {
    getProfile,
    getAgentRequests,
    getMyRooms,
    getEarnings,
    updateSettings,
    uploadPropertyDocs,
    getMyVerifications
} = require('../controllers/profileController');

const docUploads = upload.fields([
    { name: 'ownershipProof', maxCount: 1 },
    { name: 'rentalAgreement', maxCount: 1 },
    { name: 'electricityBill', maxCount: 1 },
    { name: 'propertyRegistration', maxCount: 1 },
    { name: 'propertyImages', maxCount: 6 }
]);

router.get('/', protect, getProfile);
router.get('/requests', protect, getAgentRequests);
router.get('/rooms', protect, getMyRooms);
router.get('/earnings', protect, getEarnings);
router.get('/verifications', protect, getMyVerifications);
router.put('/settings', protect, updateSettings);
router.post('/upload-docs/:bookingId', protect, docUploads, uploadPropertyDocs);

module.exports = router;
