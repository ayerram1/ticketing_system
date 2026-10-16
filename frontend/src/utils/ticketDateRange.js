const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseDateOnlyUtc = (value) => {
  if (!value || !DATE_ONLY_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

export const getDateRangeError = (startDate, endDate) => {
  const start = startDate ? parseDateOnlyUtc(startDate) : null;
  const end = endDate ? parseDateOnlyUtc(endDate) : null;

  if (startDate && !start) return "Start Date must be a valid date.";
  if (endDate && !end) return "End Date must be a valid date.";
  if (start && end && start > end) return "Start Date cannot be later than End Date.";

  return "";
};

export const matchesTicketDateRange = (ticket, startDate, endDate) => {
  if (!startDate && !endDate) return true;

  const createdAt = new Date(ticket.created_at);
  if (Number.isNaN(createdAt.getTime())) return false;

  const start = parseDateOnlyUtc(startDate);
  const end = parseDateOnlyUtc(endDate);

  if (start && createdAt < start) return false;
  if (end && createdAt >= new Date(end.getTime() + 24 * 60 * 60 * 1000)) return false;

  return true;
};

export const formatTicketCreationDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
