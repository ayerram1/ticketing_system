const express = require("express");
const passport = require("passport");
const { samlStrategy, spKey } = require("../config/passport-saml");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/login", authController.login);
router.post("/register", authController.register);

// SSO SAML Routes
router.get("/saml/login", (req, res, next) => {
  if (!spKey) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(`${frontendUrl}/login?error=SAMLNotConfigured`);
  }
  passport.authenticate("saml", { failureRedirect: "/login", session: false })(req, res, next);
});
router.post("/saml/callback", (req, res, next) => {
  passport.authenticate("saml", { session: false }, (err, user, info) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (err) {
      console.error("❌ SAML Callback Error:", err);
      return res.redirect(`${frontendUrl}/login?error=SSOFailed`);
    }

    if (!user) {
      console.warn("⚠️ SAML Callback: User not found in database:", info);
      const errorType = (info && info.message) || "UserNotFound";
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorType)}`);
    }

    req.user = user;
    return samlController.samlCallback(req, res);
  })(req, res, next);
});
router.get("/saml/metadata", (req, res) => samlController.generateMetadata(req, res, samlStrategy));

module.exports = router;