const multer = require('multer');

// Configure Memory Storage to keep files in Buffer
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit before compression
});

module.exports = upload;
