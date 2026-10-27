require("dotenv").config();
const nodemailer = require("nodemailer");
const EmailLog = require("../models/EmailLog");

console.log("[emailService.js] NODE_ENV:", process.env.NODE_ENV);

const logEmail = async (to, subject, text, status, options = {}, errorMessage = null) => {
  try {
    await EmailLog.create({
      recipient: to,
      subject,
      body: text,
      status,
      error_message: errorMessage,
      email_type: options.emailType || "manual",
      ticket_id: options.ticketId || null,
      sent_at: new Date(),
    });
  } catch (logErr) {
    console.error("Failed to log email:", logErr);
  }
};

if (process.env.NODE_ENV !== "production") {
  module.exports = async (to, subject, text, options = {}) => {
    console.log("DEV MODE: email disabled");
    await logEmail(to, subject, text, "success", options);
    return true;
  };
} else {
  // Production mode - send emails via local SMTP (Exim on localhost:25)
  const senderEmail = process.env.EMAIL_USER;

  const transporter = nodemailer.createTransport({
    host: "mail.helpdesk.asucapstonetools.com",
    port: 465,
    secure: true,        // port 465 uses SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,  // server cert is issued to GoDaddy's default hostname, not our domain
    },
  });

  /**
   * Send an email via local SMTP (Nodemailer)
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} text - Email body (plain text)
   * @param {object} options - Optional metadata { emailType, ticketId }
   */
  const sendEmail = async (to, subject, text, options = {}) => {
    try {
      const info = await transporter.sendMail({
        from: senderEmail,
        to,
        subject,
        text,
      });

      console.log("Email successful, messageId:", info.messageId);
      await logEmail(to, subject, text, "success", options);
    } catch (err) {
      console.error("Failed to send email:", err);
      await logEmail(to, subject, text, "failed", options, err.message);
      throw err;
    }
  };

  module.exports = sendEmail;
}
