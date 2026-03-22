// Vercel Serverless Function entry point for the Express backend.
// Vercel calls this module and passes (req, res) just like Express middleware.
const app = require('../app');

module.exports = app;
