const express = require('express');
const sendEmail = require('../services/emailService');
const { verifyToken, isAdmin, isDeveloperOrAdmin } = require('../middleware/authMiddleware');
const { getLogs } = require('../controllers/emailLogController');

const router = express.Router();

router.get('/logs', verifyToken, isDeveloperOrAdmin, getLogs);

router.post('/send', async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    await sendEmail(to, subject, text, { emailType: "manual" });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;