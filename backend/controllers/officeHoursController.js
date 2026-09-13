const OfficeHours = require("../models/OfficeHours");
const User = require("../models/User");

const VALID_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; // 24-hour format
const MAX_LOCATION_LENGTH = 100;

// trims outer whitespace and replaces multiple spaces with a single space
function normalizeLocation(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

//validates office hours object and structure
function validateOfficeHours(office_hours) {
  if (typeof office_hours !== "object" || office_hours === null || Array.isArray(office_hours)) {
    return "office_hours must be an object keyed by day of week";
  }

  for (const day of Object.keys(office_hours)) {
    if (!VALID_DAYS.includes(day)) {
      return `Invalid day key: ${day}`;
    }

    const dayEntry = office_hours[day];
    const { start, end } = dayEntry;

    // Empty strings are allowed
    if (start === "" && end === "") {
      dayEntry.location = normalizeLocation(dayEntry.location);
      continue;
    }

    if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) {
      return `Invalid time format for ${day}. Expected HH:MM (24-hour).`;
    }

    if (start >= end) {
      return `Start time must be before end time for ${day}.`;
    }

    const normalizedLocation = normalizeLocation(dayEntry.location);
    if (normalizedLocation.length > MAX_LOCATION_LENGTH) {
      return `Location for ${day} is too long (max ${MAX_LOCATION_LENGTH} characters).`;
    }
    dayEntry.location = normalizedLocation;
  }

  return null;
}

exports.getOfficeHoursByTAId = async (req, res) => {
  try {
    const officeHours = await OfficeHours.findOne({
      where: { ta_id: req.params.user_id },
    });
    if (!officeHours) {
      return res.json({}); // return empty object
    }
    res.json(officeHours);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignOfficeHours = async (req, res) => {
  const { office_hours } = req.body;
  const ta_id = req.params.user_id;

  //validate before assigning or updating office hours
  const validationError = validateOfficeHours(office_hours);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const existing = await OfficeHours.findOne({ where: { ta_id } });
    if (existing) {
      
      await existing.update({ office_hours });
      res.status(200).json({ message: "Office hours updated successfully." });
    } else {
      
      await OfficeHours.create({ta_id, office_hours });
      res.status(201).json({ message: "Office hours created successfully." });
    }
  } catch (error) {
    console.error("Error assigning office hours:", error);
    res.status(500).json({ error: error.message });
  }
};
