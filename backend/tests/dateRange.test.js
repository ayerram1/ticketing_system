const test = require("node:test");
const assert = require("node:assert/strict");

const { getCreationDateRange } = require("../utils/dateRange");

test("creation date ranges include the complete end date", () => {
  const range = getCreationDateRange({ startDate: "2026-10-01", endDate: "2026-10-01" });

  assert.equal(range.error, undefined);
  assert.equal(range.start.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-10-02T00:00:00.000Z");
});

test("creation date ranges support either bound independently", () => {
  const startOnly = getCreationDateRange({ startDate: "2026-10-01" });
  const endOnly = getCreationDateRange({ endDate: "2026-10-01" });

  assert.equal(startOnly.start.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(startOnly.endExclusive, null);
  assert.equal(endOnly.start, null);
  assert.equal(endOnly.endExclusive.toISOString(), "2026-10-02T00:00:00.000Z");
});

test("creation date ranges reject invalid and reversed dates", () => {
  assert.match(
    getCreationDateRange({ startDate: "2026-10-03", endDate: "2026-10-01" }).error,
    /cannot be later/
  );
  assert.match(getCreationDateRange({ startDate: "2026-02-30" }).error, /valid date/);
});
