const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const samlController = require("../controllers/samlControllers");

const router = express.Router();

router.post("/login", authController.login);
router.post("/register", authController.register);

// SSO SAML Routes
router.get("/saml/login", passport.authenticate("saml", { failureRedirect: "/login", session: false }));
router.post("/saml/callback", passport.authenticate("saml", { failureRedirect: "/login", session: false }), samlController.samlCallback);
router.get("/saml/metadata", (req, res) => samlController.generateMetadata(req, res, passport._strategy('saml')));

module.exports = router;
