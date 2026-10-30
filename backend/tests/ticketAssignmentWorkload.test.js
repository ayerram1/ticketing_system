const assert = require("node:assert/strict");
const test = require("node:test");

// This test replaces sequelize.query before the controller executes it. The
// placeholder only lets Sequelize construct its client; it never connects.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:5432/test";
}

const sequelize = require("../config/db");
const ticketAssignmentController = require("../controllers/ticketAssignmentController");

test("returns numeric workloads for TAs with multiple, one, and zero assignments", async (t) => {
  const originalQuery = sequelize.query;
  let queryText;

  sequelize.query = async (query) => {
    queryText = query;
    return [
      { user_id: "101", open_tickets: "3", total_tickets: "4" },
      { user_id: "102", open_tickets: "1", total_tickets: "1" },
      { user_id: "103", open_tickets: "0", total_tickets: "0" },
    ];
  };
  t.after(() => {
    sequelize.query = originalQuery;
  });

  let responseBody;
  const response = {
    json: (body) => {
      responseBody = body;
    },
    status: () => response,
  };

  await ticketAssignmentController.getTicketCountsByTA({}, response);

  assert.deepEqual(responseBody, [
    { user_id: 101, open_tickets: 3, total_tickets: 4 },
    { user_id: 102, open_tickets: 1, total_tickets: 1 },
    { user_id: 103, open_tickets: 0, total_tickets: 0 },
  ]);
  assert.match(queryText, /FROM ticketassignments/);
  assert.match(queryText, /FROM taticketassignments/);
  assert.match(queryText, /CAST\(tickets\.status AS TEXT\)/);
  assert.match(queryText, /CAST\(tatickets\.status AS TEXT\)/);
  assert.match(queryText, /status IN \('new', 'ongoing'\)/);
  assert.match(queryText, /LEFT JOIN/);
});
