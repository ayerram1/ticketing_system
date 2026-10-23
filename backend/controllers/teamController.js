const Team = require("../models/Team");
const TeamSponsorHistory = require("../models/TeamSponsorHistory");

const normalizeTeamName = (value) =>
  String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildCaseInsensitiveTeamNameWhere = (rawTeamName) => {
  const normalized = normalizeTeamName(rawTeamName);
  const normalizedLower = normalized.toLowerCase();
  const sequelize = Team.sequelize;

  return {
    normalized,
    where: sequelize.where(
      sequelize.fn("lower", sequelize.col("team_name")),
      normalizedLower
    ),
  };
};

exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.findAll();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.team_id);
    if (team) {
      res.json(team);
    } else {
      res.status(404).json({ error: "Team not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeamByName = async (req, res) => {
  try {
    const { normalized, where } = buildCaseInsensitiveTeamNameWhere(req.params.team_name);

    if (!normalized) {
      return res.status(400).json({ error: "Missing team_name" });
    }

    const team = await Team.findOne({ where });
    if (team) {
      res.json(team);
    } else {
      res.status(404).json({ error: "Team not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeamByNameQuery = async (req, res) => {
  try {
    const { normalized, where } = buildCaseInsensitiveTeamNameWhere(req.query.name);

    if (!normalized) {
      return res.status(400).json({ error: "Missing query param: name" });
    }

    const team = await Team.findOne({ where });
    if (team) {
      res.json(team);
    } else {
      res.status(404).json({ error: "Team not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTeam = async (req, res) => {
  try {
    const {team_name, instructor_user_id, sponsor_name, sponsor_email, grader_name, grader_email} = req.body;

    const normalizedTeamName = normalizeTeamName(team_name);
    if (!normalizedTeamName) {
      return res.status(400).json({ error: "team_name is required" });
    }
    
    const [team, created] = await Team.findOrCreate({
      where: { team_name: normalizedTeamName },
      defaults: {
        team_name: normalizedTeamName,
        instructor_user_id,
        sponsor_name,
        sponsor_email,
        grader_name,
        grader_email,
      },
    });
    if (created) {
      // Record the initial sponsor state for newly created teams
      if (sponsor_name != null || sponsor_email != null) {
        await TeamSponsorHistory.create({
          team_id: team.team_id,
          changed_by: req.user?.id ?? null,
          old_sponsor_name: null,
          new_sponsor_name: team.sponsor_name,
          old_sponsor_email: null,
          new_sponsor_email: team.sponsor_email,
        });
      }
      return res.status(201).json({ created: true, team });
    }
    return res.status(200).json({ created: false, team });
 
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

exports.updateTeam = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.team_id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const nameChanging = Object.prototype.hasOwnProperty.call(req.body, "sponsor_name") && req.body.sponsor_name !== team.sponsor_name;
    const emailChanging = Object.prototype.hasOwnProperty.call(req.body, "sponsor_email") && req.body.sponsor_email !== team.sponsor_email;

    const oldSponsorName = team.sponsor_name;
    const oldSponsorEmail = team.sponsor_email;

    await team.update(req.body);

    if (nameChanging || emailChanging) {
      await TeamSponsorHistory.create({
        team_id: team.team_id,
        changed_by: req.user?.id ?? null,
        old_sponsor_name: oldSponsorName,
        new_sponsor_name: team.sponsor_name,
        old_sponsor_email: oldSponsorEmail,
        new_sponsor_email: team.sponsor_email,
      });
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.team_id);
    if (team) {
      await team.destroy();
      res.status(204).json();
    } else {
      res.status(404).json({ error: "Team not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
