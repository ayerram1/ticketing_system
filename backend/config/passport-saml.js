const passport = require('passport');
const { Strategy: SamlStrategy } = require('@node-saml/passport-saml');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const certDir = path.join(__dirname, '../certs');
const spKeyPath = path.join(certDir, 'sp-key.pem');
const spCertPath = path.join(certDir, 'sp-cert.pem');
const idpCertPath = path.join(certDir, 'asu-idp-cert.pem');

const spKey = fs.existsSync(spKeyPath) ? fs.readFileSync(spKeyPath, 'utf8') : '';
const spCert = fs.existsSync(spCertPath) ? fs.readFileSync(spCertPath, 'utf8') : '';
// Use asu-idp-cert.pem if provided, otherwise fallback to spCert until ASU IT responds
const idpCert = (fs.existsSync(idpCertPath) ? fs.readFileSync(idpCertPath, 'utf8') : spCert) || spCert;

const samlStrategy = new SamlStrategy(
  {
    // Point to ASU IdP SSO Entry Point (Use weblogin-test.asu.edu during testing)
    entryPoint: process.env.ASU_IDP_ENTRYPOINT || 'https://weblogin-test.asu.edu/idp/profile/SAML2/Redirect/SSO',
    issuer: process.env.SAML_SP_ENTITY_ID || 'https://helpdesk.asucapstonetools.com/shibboleth',
    callbackUrl: process.env.SAML_CALLBACK_URL || 'https://helpdesk.asucapstonetools.com/api/auth/saml/callback',
    
    // IdP Public Certificate (@node-saml/passport-saml requires idpCert)
    idpCert: idpCert,
    cert: idpCert,
    
    // SP Private Key
    privateKey: spKey,
    
    decryptionPki: spKey,
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
  },
  async (profile, done) => {
    try {
      // Extract attributes released by ASU Shibboleth
      const email = profile.email || profile.mail || profile['urn:oid:0.9.2342.19200300.100.1.3'];
      const name = profile.displayName || profile.cn || `${profile.givenName || ''} ${profile.sn || ''}`.trim();
      const asurite = profile.uid || profile.nameID;

      if (!email) {
        return done(new Error('No email released from ASU Shibboleth'), null);
      }

      // Find or provision user in DB
      let user = await User.findOne({ where: { email } });

      if (!user) {
        // Auto-provision student account on first SSO login
        user = await User.create({
          name: name || asurite,
          email: email,
          role: 'student', // Default role; can be updated by admin/coordinator
          password: 'SSO_EXTERNAL_USER', // Dummy password for SAML users
          is_enabled: true,
          must_change_password: false,
        });
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
);

passport.use('saml', samlStrategy);

module.exports = { passport, samlStrategy };