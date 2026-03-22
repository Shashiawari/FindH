const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { protect } = require('../middlewares/authMiddleware');
const { createTenant, getAllTenants, getTenantById } = require('../controllers/tenantController');

// POST /api/tenants — Create a new listing  (accepts up to 4 images)
router.post('/', protect, upload.fields([{ name: 'images', maxCount: 4 }]), createTenant);

// GET /api/tenants — All listings
router.get('/', getAllTenants);

// GET /api/tenants/:id — Single listing
router.get('/:id', getTenantById);

module.exports = router;
