// backend/controllers/samlControllers.js
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

exports.samlCallback = (req, res) => {
  const user = req.user;
  
  if (!user || !user.is_enabled) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=AccountIsDisabled`);
  }

  // Issue existing JWT token format matching authController.js
  const token = jwt.sign(
    { id: user.user_id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: "1h" }
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // Redirect back to frontend with JWT token in query string
  res.redirect(`${frontendUrl}/sso-success?token=${token}`);
};

exports.generateMetadata = (req, res, samlStrategy) => {
  try {
    const certPath = path.join(__dirname, '../certs/sp-cert.pem');
    const decryptionCert = fs.existsSync(certPath) ? fs.readFileSync(certPath, 'utf8') : '';
    const metadata = samlStrategy.generateServiceProviderMetadata(decryptionCert, decryptionCert);
    res.type('application/xml').send(metadata);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};