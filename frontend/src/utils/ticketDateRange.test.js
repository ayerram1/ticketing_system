import {
  formatTicketCreationDate,
  getDateRangeError,
  matchesTicketDateRange,
} from "./ticketDateRange";

describe("ticket date range helpers", () => {
  const ticket = (created_at) => ({ created_at });

  test("supports start-only, end-only, and same-day date ranges", () => {
    expect(matchesTicketDateRange(ticket("2026-10-10T12:00:00.000Z"), "2026-10-10", "")).toBe(true);
    expect(matchesTicketDateRange(ticket("2026-10-10T23:59:59.999Z"), "", "2026-10-10")).toBe(true);
    expect(matchesTicketDateRange(ticket("2026-10-11T00:00:00.000Z"), "", "2026-10-10")).toBe(false);
    expect(matchesTicketDateRange(ticket("2026-10-10T00:00:00.000Z"), "2026-10-10", "2026-10-10")).toBe(true);
  });

  test("keeps missing dates unless a bound is active", () => {
    expect(matchesTicketDateRange(ticket(null), "", "")).toBe(true);
    expect(matchesTicketDateRange(ticket(null), "2026-10-10", "")).toBe(false);
  });

  test("validates reversed ranges and formats timestamps in the same UTC calendar", () => {
    expect(getDateRangeError("2026-10-11", "2026-10-10")).toMatch(/cannot be later/);
    expect(formatTicketCreationDate("2026-10-10T00:30:00.000Z")).toBe("Oct 10, 2026");
    expect(formatTicketCreationDate(null)).toBe("N/A");
  });
});
