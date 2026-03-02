const express = require("express");
const router = express.Router();

// Old buffer-based image routes have been removed.
// All files are now served through GET /api/files/:id using GridFS.

module.exports = router;