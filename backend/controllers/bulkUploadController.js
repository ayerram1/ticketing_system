const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");
const User = require("../models/User");
const Team = require("../models/Team");
const StudentData = require("../models/StudentData");
const TeamMember = require("../models/TeamMember");
const BulkUploadChangeHistory = require("../models/BulkUploadChangeHistory");
const sendEmail = require("../services/emailService");

const normalizeTeamName = (value) =>
  String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const trimValue = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const getUserId = (u) => u?.user_id ?? u?.id;
const getTeamId = (t) => t?.team_id ?? t?.id;

const valuesDiffer = (oldValue, newValue) =>
  String(oldValue ?? "") !== String(newValue ?? "");

const serializeHistoryValue = (value) => {
  if (value === undefined || value === null) return null;
  return String(value);
};

const addTeamUpdateIfChanged = async ({
  team,
  teamUpdates,
  fieldName,
  nextValue,
  uploadBatchId,
  changedBy,
  transaction,
}) => {
  if (!valuesDiffer(team[fieldName], nextValue)) return false;

  await recordBulkUploadChange({
    uploadBatchId,
    entityType: "team",
    entityId: getTeamId(team),
    entityName: team.team_name,
    changeType: "updated",
    fieldName,
    oldValue: team[fieldName],
    newValue: nextValue,
    changedBy,
    transaction,
  });

  teamUpdates[fieldName] = nextValue;
  return true;
};

const recordBulkUploadChange = async ({
  uploadBatchId,
  entityType,
  entityId,
  entityName,
  changeType,
  fieldName,
  oldValue,
  newValue,
  changedBy,
  transaction,
}) => {
  await BulkUploadChangeHistory.create(
    {
      upload_batch_id: uploadBatchId,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      change_type: changeType,
      field_name: fieldName,
      old_value: serializeHistoryValue(oldValue),
      new_value: serializeHistoryValue(newValue),
      changed_by: changedBy,
    },
    { transaction }
  );
};

const createTempPassword = () => `Temp#${Math.random().toString(36).slice(2, 10)}A1`;

const createTempPasswordHash = async () => {
  const temp = createTempPassword();
  const hash = await bcrypt.hash(temp, 10);
  return { temp, hash };
};


const findOrCreateUserByEmail = async ({ name, email, role, transaction, pendingEmails }) => {
  const cleanEmail = normalizeEmail(email);
  const cleanName = trimValue(name);

  if (!cleanEmail) throw new Error(`Missing email for ${role}`);
  if (!cleanName) throw new Error(`Missing name for ${role}`);

  const existing = await User.findOne({ where: { email: cleanEmail }, transaction });
  if (existing) return { user: existing, created: false };

  const { temp, hash } = await createTempPasswordHash();
  const created = await User.create(
    {
      name: cleanName,
      email: cleanEmail,
      password: hash,
      role,
      must_change_password: true,
    },
    { transaction }
  );

  if (pendingEmails) {
    pendingEmails.push({ name: cleanName,
      email: cleanEmail,
      password: temp, role });
  }

  return { user: created, created: true };
};

const sendWelcomeEmail = async ({ name, email, password, role }) => {
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

  try {
    await sendEmail(email, subject, emailBody, { emailType: "bulk_upload_welcome" });
    console.log("Bulk upload welcome email sent to", email);
  } catch (emailError) {
    console.error(`Failed to send bulk upload welcome email to ${email}:`, emailError);
  }
};

exports.previewBulk = async (req, res) => {
  const { projectRows, studentRows } = req.body || {};

  if (!Array.isArray(projectRows) || !Array.isArray(studentRows)) {
    return res.status(400).json({
      message: "projectRows and studentRows must be arrays",
    });
  }

  try {
    const preview = {
      summary: {
        teamsCreated: 0,
        teamsUpdated: 0,
        studentsCreated: 0,
        studentsUpdated: 0,
        studentsMoved: 0,
      },
      teamChanges: [],
      studentChanges: [],
    };

    const teamByName = new Map();

    for (const row of projectRows) {
      const teamName = normalizeTeamName(row.project);
      if (!teamName) throw new Error("Project/team name is required");

      const instructorEmail = trimValue(row.instructor_email);
      const instructorUser = await User.findOne({ where: { email: instructorEmail } });

      const instructorUserId = instructorUser ? getUserId(instructorUser) : null;
      const team = await Team.findOne({ where: { team_name: teamName } });

      if (!team) {
        preview.summary.teamsCreated += 1;
        preview.teamChanges.push({
          type: "created",
          teamName,
          fields: [
            { field: "Team", before: null, after: teamName },
            { field: "Instructor", before: null, after: row.instructor },
            { field: "Sponsor", before: null, after: row.sponsor },
            { field: "Grader", before: null, after: row.grader },
            { field: "Current Semester", before: null, after: row.current_semester },
            { field: "Capstone Course", before: null, after: row.capstone_course },
            { field: "Cohort Type", before: null, after: row.program_type },
          ],
        });
      } else {
        const fields = [];

        if (instructorUserId && valuesDiffer(team.instructor_user_id, instructorUserId)) {
          const oldInstructor = team.instructor_user_id
            ? await User.findByPk(team.instructor_user_id)
            : null;

          fields.push({
            field: "Instructor",
            before: oldInstructor ? `${oldInstructor.name} (#${team.instructor_user_id})` : team.instructor_user_id,
            after: instructorUser ? `${instructorUser.name} (#${instructorUserId})` : row.instructor,
          });
        }

        const teamFieldMap = [
          ["sponsor_name", "Sponsor Name", row.sponsor],
          ["sponsor_email", "Sponsor Email", row.sponsor_email],
          ["grader_name", "Grader Name", row.grader],
          ["grader_email", "Grader Email", row.grader_email],
          ["cohort_start_semester", "Cohort Start Semester", row.cohort_start_semester],
          ["current_semester", "Current Semester", row.current_semester],
          ["capstone_course", "Capstone Course", row.capstone_course],
          ["program_type", "Cohort Type", row.program_type],
        ];

        for (const [fieldName, label, rawNextValue] of teamFieldMap) {
          const nextValue = trimValue(rawNextValue);
          if (valuesDiffer(team[fieldName], nextValue)) {
            fields.push({
              field: label,
              before: team[fieldName],
              after: nextValue,
            });
          }
        }

        if (fields.length > 0) {
          preview.summary.teamsUpdated += 1;
          preview.teamChanges.push({
            type: "updated",
            teamName,
            fields,
          });
        }
      }

      teamByName.set(teamName.toLowerCase(), team || { team_name: teamName, team_id: null });
    }

    for (const row of studentRows) {
      const teamName = normalizeTeamName(row.group_name);
      if (!teamName) throw new Error("group_name is required");

      const team =
        teamByName.get(teamName.toLowerCase()) ||
        (await Team.findOne({ where: { team_name: teamName } }));

      const name = trimValue(row.name).replace(/,/g, "");
      const loginId = trimValue(row.login_id).toLowerCase();
      if (!loginId) throw new Error(`Missing login_id for student ${name || "(unknown)"}`);

      const studentEmail = `${loginId}@asu.edu`;
      const section = trimValue(row.sections);

      const student = await User.findOne({ where: { email: studentEmail } });

      if (!student) {
        preview.summary.studentsCreated += 1;
        preview.studentChanges.push({
          type: "created",
          studentName: name || studentEmail,
          email: studentEmail,
          fields: [
            { field: "Student", before: null, after: name || studentEmail },
            { field: "Team", before: null, after: teamName },
            { field: "Section", before: null, after: section },
          ],
        });
        continue;
      }

      const fields = [];
      const nextName = name || studentEmail;

      if (valuesDiffer(student.name, nextName)) {
        fields.push({
          field: "Student Name",
          before: student.name,
          after: nextName,
        });
      }

      const studentData = await StudentData.findOne({
        where: { user_id: getUserId(student) },
      });

      if (!studentData) {
        preview.summary.studentsUpdated += 1;
        preview.studentChanges.push({
          type: "updated",
          studentName: student.name,
          email: studentEmail,
          fields: [
            { field: "Student Data", before: null, after: `Team: ${teamName}, Section: ${section}` },
          ],
        });
        continue;
      }

      if (valuesDiffer(studentData.section, section)) {
        fields.push({
          field: "Section",
          before: studentData.section,
          after: section,
        });
      }

      if (team && getTeamId(team) && Number(studentData.team_id) !== Number(getTeamId(team))) {
        const oldTeam = studentData.team_id ? await Team.findByPk(studentData.team_id) : null;
        preview.summary.studentsMoved += 1;
        fields.push({
          field: "Team",
          before: oldTeam?.team_name || studentData.team_id,
          after: teamName,
        });
      }

      if (fields.length > 0) {
        preview.summary.studentsUpdated += 1;
        preview.studentChanges.push({
          type: "updated",
          studentName: student.name,
          email: studentEmail,
          fields,
        });
      }
    }

    return res.json(preview);
  } catch (error) {
    return res.status(400).json({
      message: "Bulk upload preview failed.",
      error: error.message,
    });
  }
};

exports.importBulk = async (req, res) => {
  const { projectRows, studentRows } = req.body || {};
  const uploadBatchId = `bulk-upload-${Date.now()}`;
  const changedBy = req.user?.id || req.user?.user_id || null;
  let changesTracked = 0;
  const pendingEmails = [];

  if (!Array.isArray(projectRows) || !Array.isArray(studentRows)) {
    return res.status(400).json({
      message: "projectRows and studentRows must be arrays",
    });
  }

  try {
    await sequelize.transaction(async (transaction) => {
      const teamByName = new Map();

      // First create/find INSTRUCTOR TA
      for (const row of projectRows) {
        const instructorName = trimValue(row.instructor);
        const instructorEmail = trimValue(row.instructor_email);

        await findOrCreateUserByEmail({
          name: instructorName,
          email: instructorEmail,
          role: "TA",
          transaction,
          pendingEmails,
        });
      }

      // Next create/find teams
      for (const row of projectRows) {
        const teamName = normalizeTeamName(row.project);
        if (!teamName) throw new Error("Project/team name is required");

        const instructorEmail = trimValue(row.instructor_email);
        const instructorUser = await User.findOne({
          where: { email: instructorEmail },
          transaction,
        });

        if (!instructorUser) {
          throw new Error(`Could not find TA with email ${instructorEmail}`);
        }

        const instructorUserId = getUserId(instructorUser);
        if (!instructorUserId) throw new Error(`Missing user_id for TA ${instructorEmail}`);

        let team = await Team.findOne({ where: { team_name: teamName }, transaction });

        if (!team) {
          team = await Team.create(
            {
              team_name: teamName,
              instructor_user_id: instructorUserId,
              sponsor_name: trimValue(row.sponsor),
              sponsor_email: trimValue(row.sponsor_email),
              grader_name: trimValue(row.grader),
              grader_email: trimValue(row.grader_email),
              cohort_start_semester: trimValue(row.cohort_start_semester),
              current_semester: trimValue(row.current_semester),
              capstone_course: trimValue(row.capstone_course),
              program_type: trimValue(row.program_type),
            },
            { transaction }
          );
          changesTracked += 1;
          await recordBulkUploadChange({
            uploadBatchId,
            entityType: "team",
            entityId: getTeamId(team),
            entityName: team.team_name,
            changeType: "created",
            fieldName: "team",
            oldValue: null,
            newValue: team.team_name,
            changedBy,
            transaction,
          });
        } else {
          const teamUpdates = {};

          if (valuesDiffer(team.instructor_user_id, instructorUserId)) {
            const oldInstructor = team.instructor_user_id
              ? await User.findByPk(team.instructor_user_id, { transaction })
              : null;
          
            changesTracked += 1;
          
            await recordBulkUploadChange({
              uploadBatchId,
              entityType: "team",
              entityId: getTeamId(team),
              entityName: team.team_name,
              changeType: "updated",
              fieldName: "instructor_user_id",
              oldValue: oldInstructor
                ? `${oldInstructor.name} (#${team.instructor_user_id})`
                : team.instructor_user_id,
              newValue: `${instructorUser.name} (#${instructorUserId})`,
              changedBy,
              transaction,
            });
          
            teamUpdates.instructor_user_id = instructorUserId;
          }

          const updateFields = {
            sponsor_name: trimValue(row.sponsor),
            sponsor_email: trimValue(row.sponsor_email),
            grader_name: trimValue(row.grader),
            grader_email: trimValue(row.grader_email),
            cohort_start_semester: trimValue(row.cohort_start_semester),
            current_semester: trimValue(row.current_semester),
            capstone_course: trimValue(row.capstone_course),
            program_type: trimValue(row.program_type),
          };

          for (const [fieldName, nextValue] of Object.entries(updateFields)) {
            const changed = await addTeamUpdateIfChanged({
              team,
              teamUpdates,
              fieldName,
              nextValue,
              uploadBatchId,
              changedBy,
              transaction,
            });
            if (changed) changesTracked += 1;
          }

          if (Object.keys(teamUpdates).length > 0) {
            await team.update(teamUpdates, { transaction });
          }
        }

        teamByName.set(teamName.toLowerCase(), team);
      }

      // Next generate student users
      for (const row of studentRows) {
        const teamName = normalizeTeamName(row.group_name);
        if (!teamName) throw new Error("group_name is required");

        const team =
          teamByName.get(teamName.toLowerCase()) ||
          (await Team.findOne({ where: { team_name: teamName }, transaction }));

        if (!team) throw new Error(`Team not found for student row: ${teamName}`);

        const teamId = getTeamId(team);
        if (!teamId) throw new Error(`Missing team_id for ${teamName}`);

        const name = trimValue(row.name).replace(/,/g, "");
        const loginId = trimValue(row.login_id).toLowerCase();
        if (!loginId) throw new Error(`Missing login_id for student ${name || "(unknown)"}`);

        const studentEmail = `${loginId}@asu.edu`;
        const section = trimValue(row.sections);

        let student = await User.findOne({
          where: { email: studentEmail },
          transaction,
        });

        if (!student) {
          const { temp, hash } = await createTempPasswordHash();
          student = await User.create(
            {
              name: name || studentEmail,
              email: studentEmail,
              password: hash,
              role: "student",
              must_change_password: true,
            },
            { transaction }
          );
          pendingEmails.push({
            name: name || studentEmail,
            email: studentEmail,
            password: temp,
            role: "student",
          });
          changesTracked += 1;
          await recordBulkUploadChange({
            uploadBatchId,
            entityType: "student",
            entityId: getUserId(student),
            entityName: student.name,
            changeType: "created",
            fieldName: "student",
            oldValue: null,
            newValue: studentEmail,
            changedBy,
            transaction,
          });
        } else {
          const nextName = name || studentEmail;
          if (trimValue(student.name) !== trimValue(nextName)) {
            changesTracked += 1;
            await recordBulkUploadChange({
              uploadBatchId,
              entityType: "student",
              entityId: getUserId(student),
              entityName: nextName,
              changeType: "updated",
              fieldName: "name",
              oldValue: student.name,
              newValue: nextName,
              changedBy,
              transaction,
            });
            await student.update({ name: nextName }, { transaction });
          }
        }

        const studentId = getUserId(student);
        if (!studentId) throw new Error(`Missing user_id for student ${studentEmail}`);

        let studentData = await StudentData.findOne({
          where: { user_id: studentId },
          transaction,
        });
        let membershipMoveHandled = false;

        if (!studentData) {
          await StudentData.create(
            {
              user_id: studentId,
              team_id: teamId,
              section,
            },
            { transaction }
          );
          changesTracked += 1;
          await recordBulkUploadChange({
            uploadBatchId,
            entityType: "student",
            entityId: studentId,
            entityName: student.name,
            changeType: "created",
            fieldName: "student_data",
            oldValue: null,
            newValue: JSON.stringify({ team: team.team_name, section }),
            changedBy,
            transaction,
          });
        } else {
          const oldTeamId = studentData.team_id;
          const oldSection = studentData.section;
          const teamChanged = Number(oldTeamId) !== Number(teamId);
          const sectionChanged = valuesDiffer(oldSection, section);
          const needsUpdate = sectionChanged || teamChanged;

          if (needsUpdate) {
            if (sectionChanged) {
              changesTracked += 1;
              await recordBulkUploadChange({
                uploadBatchId,
                entityType: "student",
                entityId: studentId,
                entityName: student.name,
                changeType: "updated",
                fieldName: "section",
                oldValue: oldSection,
                newValue: section,
                changedBy,
                transaction,
              });
            }

            if (teamChanged) {
              const oldTeam = oldTeamId
                ? await Team.findByPk(oldTeamId, { transaction })
                : null;
              changesTracked += 1;
              await recordBulkUploadChange({
                uploadBatchId,
                entityType: "student",
                entityId: studentId,
                entityName: student.name,
                changeType: "moved",
                fieldName: "team_id",
                oldValue: oldTeam?.team_name || oldTeamId,
                newValue: team.team_name,
                changedBy,
                transaction,
              });

              await TeamMember.destroy({
                where: { team_id: oldTeamId, user_id: studentId },
                transaction,
              });
              await TeamMember.create(
                { team_id: teamId, user_id: studentId },
                { transaction }
              );
              membershipMoveHandled = true;

              changesTracked += 1;
              await recordBulkUploadChange({
                uploadBatchId,
                entityType: "team_member",
                entityId: studentId,
                entityName: student.name,
                changeType: "moved",
                fieldName: "team_membership",
                oldValue: oldTeam?.team_name || oldTeamId,
                newValue: team.team_name,
                changedBy,
                transaction,
              });
            }

            await studentData.update(
              {
                section,
                team_id: teamId,
              },
              { transaction }
            );
          }
        }

        // ensure team member exists
        const existingMember = await TeamMember.findOne({
          where: { team_id: teamId, user_id: studentId },
          transaction,
        });

        if (!existingMember && !membershipMoveHandled) {
          await TeamMember.create(
            { team_id: teamId, user_id: studentId },
            { transaction }
          );
          changesTracked += 1;
          await recordBulkUploadChange({
            uploadBatchId,
            entityType: "team_member",
            entityId: studentId,
            entityName: student.name,
            changeType: "added",
            fieldName: "team_membership",
            oldValue: null,
            newValue: team.team_name,
            changedBy,
            transaction,
          });
        }
      }

      // Finally create/find grader users
      for (const row of projectRows) {
        await findOrCreateUserByEmail({
          name: trimValue(row.grader),
          email: trimValue(row.grader_email),
          role: "grader",
          transaction,
          pendingEmails,
        });
      }
    });

    await Promise.allSettled(pendingEmails.map((u) => sendWelcomeEmail(u)));

    return res.status(200).json({
      message: "Bulk import completed successfully",
      uploadBatchId,
      changesTracked,
      emailsSent: pendingEmails.length,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Bulk import failed. No data was saved.",
      error: error.message,
    });
  }
};

exports.getChangeHistory = async (req, res) => {
  try {
    const {
      uploadBatchId,
      entityType,
      entityId,
      limit = 100,
    } = req.query;

    const where = {};
    if (uploadBatchId) where.upload_batch_id = uploadBatchId;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;

    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const history = await BulkUploadChangeHistory.findAll({
      where,
      include: [
        {
          model: User,
          as: "changedBy",
          attributes: ["user_id", "name", "email"],
          required: false,
        },
      ],
      order: [["changed_at", "DESC"], ["id", "DESC"]],
      limit: safeLimit,
    });

    const batchRows = await BulkUploadChangeHistory.findAll({
      attributes: ["upload_batch_id"],
      where: uploadBatchId ? { upload_batch_id: uploadBatchId } : {},
      group: ["upload_batch_id"],
      order: [[sequelize.fn("MAX", sequelize.col("changed_at")), "DESC"]],
      limit: 25,
    });

    return res.json({
      history,
      batches: batchRows.map((row) => row.upload_batch_id),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
