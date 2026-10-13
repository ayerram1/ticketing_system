const passport = require('passport');
const { Strategy: SamlStrategy } = require('@node-saml/passport-saml');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const certDir = path.join(__dirname, '../certs');
const spKeyPath = path.join(certDir, 'sp-key.pem');
const spCertPath = path.join(certDir, 'sp-cert.pem');
const idpCertPath = path.join(certDir, 'asu-idp-cert.pem');

// Read private key from environment variable first, then fallback to certs directory
const spKey = process.env.SAML_SP_PRIVATE_KEY 
  ? process.env.SAML_SP_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : (fs.existsSync(spKeyPath) ? fs.readFileSync(spKeyPath, 'utf8') : '');

// Read public certificate from environment variable first, then fallback to certs directory
const spCert = process.env.SAML_SP_CERT 
  ? process.env.SAML_SP_CERT.replace(/\\n/g, '\n') 
  : (fs.existsSync(spCertPath) ? fs.readFileSync(spCertPath, 'utf8') : '');

// Safe placeholder cert so server never crashes on startup if certs are missing
const placeholderCert = '-----BEGIN CERTIFICATE-----\nMIIC\n-----END CERTIFICATE-----';

// Use asu-idp-cert.pem if provided, otherwise fallback to spCert or placeholder
const idpCert = process.env.ASU_IDP_CERT
  ? process.env.ASU_IDP_CERT.replace(/\\n/g, '\n')
  : ((fs.existsSync(idpCertPath) ? fs.readFileSync(idpCertPath, 'utf8') : spCert) || spCert || placeholderCert);

const samlStrategy = new SamlStrategy(
  {
    // Point to ASU IdP SSO Entry Point (Production: weblogin.asu.edu)
    entryPoint: process.env.ASU_IDP_ENTRYPOINT || 'https://weblogin.asu.edu/idp/profile/SAML2/Redirect/SSO',
    issuer: process.env.SAML_SP_ENTITY_ID || 'https://helpdesk.asucapstonetools.com/shibboleth',
    callbackUrl: process.env.SAML_CALLBACK_URL || 'https://helpdesk.asucapstonetools.com/api/auth/saml/callback',
    
    // IdP Public Certificate (@node-saml/passport-saml requires idpCert)
    idpCert: idpCert,
    cert: idpCert,
    
    // SP Private Key (optional if not uploaded yet)
    privateKey: spKey || undefined,
    decryptionPki: spKey || undefined,
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

      // Find user in DB
      let user = await User.findOne({ where: { email } });

      if (!user) {
        // Do NOT create an account. Reject authentication.
        return done(null, false, { message: 'UserNotFound' });
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
);

passport.use('saml', samlStrategy);

module.exports = { passport, samlStrategy, spKey, spCert };