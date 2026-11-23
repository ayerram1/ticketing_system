const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../services/emailService");
const { validatePassword } = require("../utils/passwordValidator");

exports.login = async (req, res) => {
  const token = req.body["cf-turnstile-response"] || req.body.turnstileToken;
  const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const expectedAction = "login";
  const expectedHostnames = new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? "localhost,127.0.0.1,helpdesk.asucapstonetools.com")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );

  const turnstileSecret = process.env.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET_KEY;

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 2048 ||
    expectedHostnames.size === 0 ||
    !turnstileSecret
  ) {
    return res.status(403).json({ error: "Captcha verification failed: token missing or invalid" });
  }

  let result;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: token,
        ...(clientIp ? { remoteip: clientIp } : {}),
      }),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    result = await r.json();
  } catch (err) {
    console.error("Turnstile siteverify error:", err);
    return res.status(403).json({ error: "Captcha verification failed" });
  }

  if (
    !result.success ||
    (result.action && result.action !== expectedAction) ||
    !expectedHostnames.has(result.hostname)
  ) {
    return res.status(403).json({ error: "Captcha verification failed" });
  }

  const email = String(req.body.email ?? "").trim().toLowerCase();
  const { password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

      if (!user.is_enabled) {
          return res.status(403).json({ error: "Account is disabled" });
      }

    user.last_login = new Date();
    await user.save();

    const token = jwt.sign({ id: user.user_id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ 
      token,
      mustChangePassword: user.must_change_password 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.register = async (req, res) => {
  const { name, password, role, must_change_password } = req.body;
  const email = String(req.body.email ?? "").trim().toLowerCase();
  // const { name, email, password, role, asu_id } = req.body;
  // if (!asu_id || !/^\d{10}$/.test(asu_id)) {
  //   return res.status(400).json({ error: "Invalid ASU ID. It must be a 10-digit number." });
  // }

  try {
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        error: "Password policy violation",
        details: passwordCheck.errors,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: { 
        name, 
        email, 
        password: hashedPassword, 
        role,
        must_change_password: must_change_password || false
      },
    });

    // const user = await User.create({
    //   name,
    //   email,
    //   password: hashedPassword,
    //   role,
    //   // asu_id,
    // });

    //Automated e-mail notification for new account creation    
    //Automatically send for non-students.
    //Send student ones manually to avoid confusion since students may not expect an account to be created for them when they are.
    if (created && role !== "student") {
      try {
        const subject = "Welcome to the ASU Capstone Help Desk System";
        const emailBody = 
        `
        Hello ${name},

        Your account has been created for the ASU Capstone Help Desk System.

        Login at: https://helpdesk.asucapstonetools.com/login 

        Email: ${email}
        Password: ${password}
        Role: ${role}

        Please change your password after your first login. Password is generated for one time use.

        If you have any questions or need assistance, please contact your instructor or reach out for assistance

        Best regards,
        ASU Capstone Help Desk Team`;

        await sendEmail(email, subject, emailBody);
        console.log("Welcome email sent to", email);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }
    

    if (created) return res.status(201).json({ created: true, user });
    return res.status(200).json({ created: false, user });
 
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const details = (error.errors || []).map(e => ({ path: e.path, message: e.message }));
      return res.status(409).json({ error: 'Unique constraint', details });
    }
    if (error.name === 'SequelizeValidationError') {
      const details = (error.errors || []).map(e => ({ path: e.path, message: e.message }));
      return res.status(400).json({ error: 'Validation error', details });
    }

    res.status(500).json({ error: error.message });
  }
};
