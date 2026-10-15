const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turns the value from an HTML date input into a UTC calendar-day boundary.
 * Keeping the range in UTC makes the API's date filtering deterministic and
 * matches the date formatting used by the ticket views.
 */
const parseDateOnlyUtc = (value) => {
  if (!value || !DATE_ONLY_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  // Date.UTC normalizes invalid values (for example, February 30), so verify
  // that the original calendar date survived the conversion.
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const getCreationDateRange = ({ startDate, endDate }) => {
  const start = startDate ? parseDateOnlyUtc(startDate) : null;
  const end = endDate ? parseDateOnlyUtc(endDate) : null;

  if (startDate && !start) {
    return { error: "Start Date must be a valid date." };
  }

  if (endDate && !end) {
    return { error: "End Date must be a valid date." };
  }

  if (start && end && start > end) {
    return { error: "Start Date cannot be later than End Date." };
  }

  return {
    start,
    // Use an exclusive next-day bound so the full selected end date is kept.
    endExclusive: end ? new Date(end.getTime() + 24 * 60 * 60 * 1000) : null,
  };
};

module.exports = { getCreationDateRange, parseDateOnlyUtc };
