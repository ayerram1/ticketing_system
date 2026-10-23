const User = require("../models/User");
const bcrypt = require("bcryptjs"); // Required for password change
const StudentData = require("../models/StudentData");
const Team = require("../models/Team");
const { validatePassword } = require("../utils/passwordValidator");
const sendEmail = require("../services/emailService");
// github tracking

const VALID_USER_ROLES = ["student", "TA", "admin", "grader", "developer"];
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.user_id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ where: { email } });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      password,
      notifications_enabled,
      dark_mode,
      is_enabled,
      must_change_password,
    } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: "Name, email, role, and password are required" });
    }

    if (!VALID_USER_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    let storedPassword = password;
    if (!BCRYPT_HASH_RE.test(password)) {
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({
          error: "Password policy violation",
          details: passwordCheck.errors,
        });
      }
      storedPassword = await bcrypt.hash(password, 10);
    }

    const user = await User.create({
      name,
      email,
      role,
      password: storedPassword,
      notifications_enabled,
      dark_mode,
      is_enabled,
      must_change_password: must_change_password ?? false,
    });

    res.status(201).json({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      notifications_enabled: user.notifications_enabled,
      dark_mode: user.dark_mode,
      is_enabled: user.is_enabled,
      must_change_password: user.must_change_password,
    });
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

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.user_id);
    if (user) {
      const {
        name,
        email,
        notifications_enabled,
        dark_mode,
        is_enabled,
      } = req.body;

      await user.update({
        name,
        email,
        notifications_enabled,
        dark_mode,
        is_enabled,
      });

      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.user_id);
    if (user) {
      await user.destroy();
      res.status(204).json();
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;
        if (!VALID_USER_ROLES.includes(role)) {
            return res.status(400).json({ error: "Invalid role specified" });
        }

        if (!User.associations.StudentData) {
            User.hasOne(StudentData, { foreignKey: 'user_id' });
            StudentData.belongsTo(User, { foreignKey: 'user_id' });
        }

        if (!StudentData.associations.Team) {
            Team.hasMany(StudentData, { foreignKey: 'team_id' });
            StudentData.belongsTo(Team, { foreignKey: 'team_id' });
        }

        let queryOptions = {
            where: { role },
            attributes: ['user_id', 'name', 'email', 'is_enabled'],
        };

        if (role === 'student') {
            queryOptions.include = [
                {
                    model: StudentData,
                    required: false,
                    attributes: ['section', 'semester'],
                    include: [
                        {
                            model: Team,
                            required: false,
                            attributes: ['team_name', 'sponsor_name'],
                        }
                    ]
                }
            ];
        }

        const users = await User.findAll(queryOptions);

        const flatUsers = users.map(user => {
            const u = user.toJSON();

            if (role === 'student') {
                const sData = u.StudentData || u.StudentDatum || {};
                const team = sData.Team || {};

              return {
                  user_id: u.user_id,
                  name: u.name,
                  email: u.email,
                  is_enabled: u.is_enabled,
                  semester: sData.semester || "N/A",
                  section: sData.section || "N/A",
                  sponsor: team.sponsor_name || "N/A",
                  team_name: team.team_name || "N/A"
                };
            }
            return u;
        });

        res.json(flatUsers);

    } catch (error) {
        console.error("Error in getUsersByRole:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: "User id not provided" });
    }

    const user = await User.findByPk(userId, {
      attributes: [
        "user_id",
        "name",
        "email",
        "role",
        "notifications_enabled",
        "dark_mode",
        "is_enabled"
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Restore missing changePassword handler
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: "User ID not provided" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new passwords are required" });
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        error: "Password policy violation",
        details: passwordCheck.errors,
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await user.update({ 
      password: hashedNewPassword,
      must_change_password: false 
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Consider moving these email notification functions to a separate controller for better organization
exports.emailNotification = async (req, res) => {
  try {
    const { name, email, role, password} = req.body;

    if (!name || !email || !role || !password) {
    // if (!name || !email || !role) {
      return res.status(400).json({ error: "Name, email, role, and password are required" });
    }

    if (!VALID_USER_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // console.log('User stuff: ', user.password);
    

    //Should be fine to ignore password policy if it's random and temp
    let hashedPassword = password;
    hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      await user.update({ 
        password: hashedPassword,
        must_change_password: true // Force password change on first login
      });
      console.log(`Password updated for user: ${email}`);
    } catch (updateError) {
      console.error(`Failed to update password for ${email}:`, updateError);
      return res.status(500).json({ error: "Failed to update user password." });
    }

    try {
      const subject = "Welcome to the ASU Capstone Help Desk System";
      const emailBody =
      `
      Hello ${name},

      Your account has been created for the ASU Capstone Help Desk System.

      Login at: https://helpdesk.asucapstonetools.com/login 

      Email: ${user.email}
      Password: ${password}
      Role: ${user.role}

      Please change your password after your first login. Password is generated for one time use.

      If you have any questions or need assistance, please contact your instructor or reach out for assistance

      Best regards,
      ASU Capstone Help Desk Team`;

      await sendEmail(email, subject, emailBody);
      console.log("Welcome email sent to", email);
    } catch (emailError) {
      console.error(`Failed to send email to ${email}:`, emailError);
      return res.status(500).json({ error: "Failed to send notification email." });
    }

    return res.status(200).json({ message: "Welcome email sent.", user });
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

exports.emailNotification2 = async (req, res) => {
  try {
    const { name, email, role, password} = req.body;

    if (!name || !email || !role || !password) {
    // if (!name || !email || !role) {
      return res.status(400).json({ error: "Name, email, role, and password are required" });
    }

    if (!VALID_USER_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // console.log('User stuff: ', user.password);

    try {
      const subject = "test2";
      const emailBody = `test2`;

      await sendEmail(email, subject, emailBody);
      console.log("Test email sent to", email);
    } catch (emailError) {
      console.error(`Failed to send email to ${email}:`, emailError);
      return res.status(500).json({ error: "Failed to send notification email." });
    }

    return res.status(200).json({ message: "Test email sent.", user });
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


exports.emailNotification3 = async (req, res) => {
  try {
    const { name, email, role, password} = req.body;

    if (!name || !email || !role || !password) {
    // if (!name || !email || !role) {
      return res.status(400).json({ error: "Name, email, role, and password are required" });
    }

    if (!VALID_USER_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // console.log('User stuff: ', user.password);

    try {
      const subject = "test3";
      const emailBody = `test3`;

      await sendEmail(email, subject, emailBody);
      console.log("Test email sent to", email);
    } catch (emailError) {
      console.error(`Failed to send email to ${email}:`, emailError);
      return res.status(500).json({ error: "Failed to send notification email." });
    }

    return res.status(200).json({ message: "Test email sent.", user });
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