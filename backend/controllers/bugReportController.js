const Joi = require("joi");
const { Op } = require("sequelize");
const { BugReport, BugReportNote, User } = require("../models");

const hasAttr = (name) => !!BugReport?.rawAttributes?.[name];
const reporterInclude = {
  model: User,
  as: "reporter",
  attributes: ["user_id", "name", "email"],
};
const AUTO_CLOSE_DELAY_MS = 24 * 60 * 60 * 1000;

const isDevOrAdmin = (req) => ["developer", "admin"].includes(req.user?.role);
const authorInclude = { model: User, as: "author", attributes: ["user_id", "name"] };

const withPriority = (row) => {
  const plain = row?.toJSON ? row.toJSON() : row;
  if (!plain) return plain;
  return {
    ...plain,
    priority: plain.severity
      ? plain.severity.charAt(0).toUpperCase() + plain.severity.slice(1)
      : null,
  };
};

const shouldAutoClose = (row) => {
  if (!row || row.status !== "resolved") return false;
  const resolvedAt = new Date(row.updatedAt);
  if (Number.isNaN(resolvedAt.getTime())) return false;
  return Date.now() - resolvedAt.getTime() >= AUTO_CLOSE_DELAY_MS;
};

const autoCloseBugReport = async (row) => {
  if (!shouldAutoClose(row)) return row;
  await row.update({ status: "closed" });
  return row;
};

const autoCloseBugReports = async (rows) =>
  Promise.all(rows.map(async (row) => autoCloseBugReport(row)));

const normalizePriorityToSeverity = (value) => {
  if (!value) return value;
  const map = {
    Low: "low",
    Medium: "medium",
    High: "high",
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical",
    Critical: "critical",
  };
  return map[value] || value.toLowerCase();
};

const createSchema = Joi.object({
  subject: Joi.string().trim().max(255).required(),
  description: Joi.string().trim().max(10000).required(),
  priority: Joi.string().valid("Low", "Medium", "High").optional(),
  severity: Joi.string().valid("low", "medium", "high", "critical").optional(),
  context: Joi.object({
    page: Joi.string().max(200).allow(""),
    browser: Joi.string().max(300).allow(""),
    viewport: Joi.string().max(30).allow(""),
  }).unknown(false).optional(),
}).unknown(false);

const updateSchema = Joi.object({
  subject: Joi.string().trim().max(255),
  description: Joi.string().trim().max(10000),
  priority: Joi.string().valid("Low", "Medium", "High"),
  severity: Joi.string().valid("low", "medium", "high", "critical"),
  status: Joi.string().valid("open", "triaged", "in_progress", "resolved", "closed"),
}).min(1).unknown(false);

const noteSchema = Joi.object({
  note: Joi.string().trim().min(1).max(2000).required(),
}).unknown(false);



exports.create = async (req, res) => {
  try {
    const { value, error } = createSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res
        .status(400)
        .json({ ok: false, errors: error.details.map((d) => d.message) });
    }

    const payload = {
      subject: value.subject,
      description: value.description,
    };

    const normalizedSeverity =
      value.priority ? normalizePriorityToSeverity(value.priority) : value.severity;

    if (hasAttr("severity") && normalizedSeverity) {
      payload.severity = normalizedSeverity;
    }

    if (hasAttr("status")) payload.status = "open";

    if (hasAttr("reporter_context")) {
      payload.reporter_context = {
        ...(value.context || {}),
        role: req.user?.role || null,
      };
    }

    const uid = req.user?.user_id ?? req.user?.id ?? null;
    if (uid !== null) {
      if (hasAttr("user_id")) payload.user_id = uid;
      if (hasAttr("reporter_id")) payload.reporter_id = uid;
    }

    const saved = await BugReport.create(payload);
    const createdRow = await BugReport.findByPk(saved.id, { include: [reporterInclude] });
    return res.status(201).json({ ok: true, data: createdRow });
  } catch (e) {
    console.error("[bugReportController.create]", e);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
};

exports.list = async (req, res) => {
  try {
    const where = {};

    if (!isDevOrAdmin(req) || req.query.mine === "true") {
      where.reporter_id = req.user?.id ?? -1;
    }

    if (req.query.status && hasAttr("status")) {
      where.status = req.query.status;
    }

    if (req.query.priority && hasAttr("severity")) {
      where.severity = normalizePriorityToSeverity(req.query.priority);
    } else if (req.query.severity && hasAttr("severity")) {
      where.severity = req.query.severity;
    }

    if (req.query.q && hasAttr("subject")) {
      where[Op.or] = [
        { subject: { [Op.like]: `%${req.query.q}%` } },
        hasAttr("description")
          ? { description: { [Op.like]: `%${req.query.q}%` } }
          : null,
      ].filter(Boolean);
    }

    const rows = await BugReport.findAll({
      where,
      include: [reporterInclude],
      order: [["createdAt", "DESC"]],
    });
    await autoCloseBugReports(rows);

    return res.json({ ok: true, data: rows.map(withPriority) });
  } catch (e) {
    console.error("[bugReportController.list]", e);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: "Invalid id" });
    }

    const row = await BugReport.findByPk(id, { include: [reporterInclude] });
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    if (!isDevOrAdmin(req) && row.reporter_id !== (req.user?.id ?? null)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    await autoCloseBugReport(row);

    return res.json({ ok: true, data: withPriority(row) });
  } catch (e) {
    console.error("[bugReportController.getOne]", e);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: "Invalid id" });
    }

    const { value, error } = updateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res
        .status(400)
        .json({ ok: false, errors: error.details.map((d) => d.message) });
    }

    const row = await BugReport.findByPk(id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    await autoCloseBugReport(row);

    if (row.status === "closed") {
      return res.status(400).json({
        ok: false,
        error: "Closed bug reports cannot be edited.",
      });
    }

    const updates = {};

    if (value.subject !== undefined && hasAttr("subject")) {
      updates.subject = value.subject;
    }

    if (value.description !== undefined && hasAttr("description")) {
      updates.description = value.description;
    }

    if ((value.priority !== undefined || value.severity !== undefined) && hasAttr("severity")) {
      updates.severity = value.priority
        ? normalizePriorityToSeverity(value.priority)
        : value.severity;
    }

    if (value.status !== undefined && hasAttr("status")) {
      updates.status = value.status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: "No valid fields to update" });
    }

    await row.update(updates);
    const updatedRow = await BugReport.findByPk(id, { include: [reporterInclude] });
    return res.json({ ok: true, data: withPriority(updatedRow) });
  } catch (e) {
    console.error("[bugReportController.update]", e);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: "Invalid id" });
    }

    const row = await BugReport.findByPk(id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });

    await row.destroy();
    return res.json({ ok: true });
  } catch (e) {
    console.error("[bugReportController.remove]", e);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
};

exports.listNotes = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: "Invalid id" });
    }
    const notes = await BugReportNote.findAll({
      where: { bug_report_id: id },
      include: [authorInclude],
      order: [["createdAt", "ASC"]],
    });
    return res.json({ ok: true, data: notes });
  } catch (e) {
    console.error("[bugReportController.listNotes]", e);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
};

exports.addNote = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: "Invalid id" });
    }
    const { value, error } = noteSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ ok: false, errors: error.details.map((d) => d.message) });
    }
    const report = await BugReport.findByPk(id);
    if (!report) return res.status(404).json({ ok: false, error: "Not found" });

    const saved = await BugReportNote.create({
      bug_report_id: id,
      author_id: req.user?.id ?? null,
      note: value.note,
    });
    const note = await BugReportNote.findByPk(saved.id, { include: [authorInclude] });
    return res.status(201).json({ ok: true, data: note });
  } catch (e) {
    console.error("[bugReportController.addNote]", e);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
};