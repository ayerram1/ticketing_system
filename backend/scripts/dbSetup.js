const { Pool } = require("pg");
const { faker } = require("@faker-js/faker");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Initialize connection pool
const pool = new Pool({
  connectionString:
  	"postgresql://myuser:mypassword@127.0.0.1:5432/mydatabase",
	//ssl: { rejectUnauthorized: false }, // Only needed if using SSL in production
});

// Helper function to hash passwords
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

faker.seed(123); // so data stays the same even after resetting database

// Generate data for Users table
async function insertUsers() {
  const roles = ["student", "TA", "admin", "grader", "developer"];
  const defaultPassword = "password";
  const hashedPassword = await hashPassword(defaultPassword);

  const userPromises = Array.from({ length: 20 }).map(async (_, i) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = firstName + " " + lastName;
    const email =
      i === 0
        ? "admin1@asu.edu"
        : faker.internet.email({
            firstName: firstName,
            lastName: lastName,
            provider: "asu.edu",
          });

    const role = i === 0 ? "admin" : roles[Math.floor(Math.random() * roles.length)];

    return pool.query(
      "INSERT INTO users (name, email, role, password) VALUES ($1, $2, $3, $4)",
      [name, email, role, hashedPassword]
    );
  });

  await Promise.all(userPromises);
  console.log("Inserted users");
}

// Generate data for Teams table
async function insertTeams() {
  const instructors = await pool.query(
    "SELECT user_id FROM users WHERE role = 'TA'"
  );

  const teamPromises = Array.from({ length: 5 }).map(() => {
    const instructor_id =
      instructors.rows[Math.floor(Math.random() * instructors.rows.length)].user_id;
    const sponsorNames = faker.person.fullName();
    const sponsorEmail = sponsorNames.replace(/\s+/g, "") + "@gmail.com";
    const teamName = faker.company.name();

    return pool.query(
      "INSERT INTO teams (team_name, instructor_user_id, sponsor_name, sponsor_email) VALUES ($1, $2, $3, $4)",
      [teamName, instructor_id, sponsorNames, sponsorEmail]
    );
  });

  await Promise.all(teamPromises);
  console.log("Inserted teams");
}

// Generate data for StudentData table
async function insertStudentData() {
  const students = await pool.query(
    "SELECT user_id FROM users WHERE role = 'student'"
  );
  const teams = await pool.query("SELECT team_id FROM teams");

  const studentDataPromises = students.rows.map((student) => {
    const team = teams.rows[Math.floor(Math.random() * teams.rows.length)];
    const section = faker.string.numeric(5);
    const semester = "SPRING26";

    return pool.query(
      "INSERT INTO studentdata (user_id, team_id, section, semester, acct_creation) VALUES ($1, $2, $3, $4, NOW())",
      [student.user_id, team.team_id, section, semester]
    );
  });

  await Promise.all(studentDataPromises);
  console.log("Inserted student data");
}

// Generate data for TeamMembers table
async function insertTeamMembers() {
  const students = await pool.query(
    "SELECT user_id FROM users WHERE role = 'student'"
  );
  const teams = await pool.query("SELECT team_id FROM teams");

  const teamMemberPromises = students.rows.map((student) => {
    const team = teams.rows[Math.floor(Math.random() * teams.rows.length)];
    return pool.query(
      "INSERT INTO teammembers (team_id, user_id) VALUES ($1, $2)",
      [team.team_id, student.user_id]
    );
  });

  await Promise.all(teamMemberPromises);
  console.log("Inserted team members");
}

// Generate data for Tickets table
async function insertTickets() {
  const issueTypes = ["Bug", "Feature Request", "Question", "Other"];
  const statuses = ["new", "ongoing", "resolved"];

  const students = await pool.query(
    "SELECT user_id FROM users WHERE role = 'student'"
  );
  const teams = await pool.query("SELECT team_id FROM teams");

  const ticketPromises = Array.from({ length: 10 }).map(async () => {
    const student = students.rows[Math.floor(Math.random() * students.rows.length)];

    const studentInfo = await pool.query(
      `
      SELECT 
        sd.team_id,
        sd.section,
        t.team_name,
        t.sponsor_name
      FROM studentdata sd
      JOIN teams t ON sd.team_id = t.team_id
      WHERE sd.user_id = $1
    `,
      [student.user_id]
    );

    const studentData = studentInfo.rows[0] || {
      team_id: teams.rows[Math.floor(Math.random() * teams.rows.length)].team_id,
      section: "Default Section",
      team_name: "Default Team",
      sponsor_name: "Default Sponsor",
    };

    const issueDescription = faker.lorem.sentence();
    const issueType = issueTypes[Math.floor(Math.random() * issueTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    return pool.query(
      "INSERT INTO tickets (student_id, team_id, issue_description, sponsor_name, section, issue_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        student.user_id,
        studentData.team_id,
        issueDescription,
        studentData.sponsor_name,
        studentData.section,
        issueType,
        status,
      ]
    );
  });

  await Promise.all(ticketPromises);
  console.log("Inserted tickets");
}

// Generate data for TicketAssignments table
async function insertTicketAssignments() {
  const tas = await pool.query("SELECT user_id FROM users WHERE role = 'TA'");
  const students = await pool.query(
    "SELECT user_id FROM users WHERE role = 'student'"
  );
  const tickets = await pool.query("SELECT ticket_id, student_id FROM tickets");

  const eligibleUsers = [
    ...tas.rows,
    ...students.rows.slice(0, Math.floor(students.rows.length / 2)),
  ];

  const assignmentPromises = tickets.rows.map(async (ticket) => {
    const student_id = ticket.student_id;

    const assigned_instructor = await pool.query(
      `
      SELECT 
        t.instructor_user_id
      FROM studentdata sd
      JOIN teams t ON sd.team_id = t.team_id
      WHERE sd.user_id = $1
    `,
      [student_id]
    );

    const assigned_instructor_id =
      assigned_instructor.rows[0]?.instructor_user_id ||
      eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)].user_id;

    return pool.query(
      "INSERT INTO ticketassignments (ticket_id, user_id) VALUES ($1, $2)",
      [ticket.ticket_id, assigned_instructor_id]
    );
  });

  await Promise.all(assignmentPromises);
  console.log("Inserted ticket assignments");
}

// Generate data for TicketCommunications table
async function insertTicketCommunications() {
  const tickets = await pool.query("SELECT ticket_id FROM tickets");
  const users = await pool.query("SELECT user_id FROM users");

  const communicationPromises = Array.from({ length: 30 }).map(() => {
    const ticket = tickets.rows[Math.floor(Math.random() * tickets.rows.length)];
    const user = users.rows[Math.floor(Math.random() * users.rows.length)];
    const message = faker.lorem.paragraph();

    return pool.query(
      "INSERT INTO ticketcommunications (ticket_id, user_id, message) VALUES ($1, $2, $3)",
      [ticket.ticket_id, user.user_id, message]
    );
  });

  await Promise.all(communicationPromises);
  console.log("Inserted ticket communications");
}

/*
async function insertOfficeHours() {
  const users = await pool.query("SELECT user_id FROM users WHERE role = 'TA'");

  const schedulePromises = Array.from({ length: users.rows.length }).map(() => {
    const user = users.rows[Math.floor(Math.random() * users.rows.length)];
    const office_hours = "Monday: 1:00 PM - 2:00 PM, Tuesday: 3:00 PM - 4:00 PM";
    return pool.query(
      "INSERT INTO officehours (ta_id, schedule) VALUES ($1, $2)",
      [user.user_id, schedule]
    );
  });

  await Promise.all(schedulePromises);
  console.log("Inserted TA office hours");
}
*/

// Main function to execute all insertions
async function clearData() {
  await pool.query(`
    TRUNCATE TABLE
      ticketcommunications,
      ticketassignments,
      tickets,
      teammembers,
      studentdata,
      teams,
      users
    RESTART IDENTITY CASCADE
  `);
  console.log("Cleared existing data");
}
async function generateData() {
  try {
    await insertUsers();
    await insertTeams();
    await insertStudentData();
    await insertTeamMembers();
    await insertTickets();
    await insertTicketAssignments();
    await insertTicketCommunications();

    console.log("Fake data inserted successfully!");
  } catch (error) {
    console.error("Error inserting data:", error);
  } finally {
    await pool.end();
  }
}

generateData();