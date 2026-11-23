import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
import os

load_dotenv()

connection_string = os.getenv("DATABASE_URL")

TABLES = {}
TABLES['Users'] = (
    "CREATE TABLE IF NOT EXISTS Users ("
    "  user_id SERIAL PRIMARY KEY,"
    "  name VARCHAR(100) NOT NULL,"
    "  email VARCHAR(100) UNIQUE NOT NULL,"
    "  role VARCHAR(10) CHECK (role IN ('student', 'TA', 'admin', 'grader', 'developer', 'c-developer')) NOT NULL,"
    "  password VARCHAR(255) NOT NULL DEFAULT 'test'"
    # "  asu_id VARCHAR(10) NOT NULL"
    ")"
)

TABLES['Teams'] = (
    "CREATE TABLE IF NOT EXISTS Teams ("
    "  team_id SERIAL PRIMARY KEY,"
    "  team_name VARCHAR(100) NOT NULL"
    ")"
)

TABLES['TeamMembers'] = (
    "CREATE TABLE IF NOT EXISTS TeamMembers ("
    "  team_member_id SERIAL PRIMARY KEY,"
    "  team_id INT NOT NULL,"
    "  student_id INT NOT NULL,"
    "  FOREIGN KEY (team_id) REFERENCES Teams(team_id),"
    "  FOREIGN KEY (student_id) REFERENCES Users(user_id),"
    "  UNIQUE (team_id, student_id)"
    ")"
)

TABLES['Tickets'] = (
    "CREATE TABLE IF NOT EXISTS Tickets ("
    "  ticket_id SERIAL PRIMARY KEY,"
    "  student_id INT NOT NULL,"
    "  team_id INT NOT NULL,"
    "  issue_description TEXT NOT NULL,"
    "  issue_type VARCHAR(50) NOT NULL,"
    "  status VARCHAR(10) CHECK (status IN ('new', 'ongoing', 'resolved')) DEFAULT 'new',"
    "  escalated BOOLEAN DEFAULT FALSE,"
    "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
    "  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
    "  asu_id VARCHAR(10) NOT NULL,"
    "  FOREIGN KEY (student_id) REFERENCES Users(user_id),"
    "  FOREIGN KEY (team_id) REFERENCES Teams(team_id)"
    ")"
)

TABLES['TicketAssignments'] = (
    "CREATE TABLE IF NOT EXISTS TicketAssignments ("
    "  assignment_id SERIAL PRIMARY KEY,"
    "  ticket_id INT NOT NULL,"
    "  ta_id INT NOT NULL,"
    "  FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id),"
    "  FOREIGN KEY (ta_id) REFERENCES Users(user_id)"
    ")"
)

TABLES['TicketCommunications'] = (
    "CREATE TABLE IF NOT EXISTS TicketCommunications ("
    "  communication_id SERIAL PRIMARY KEY,"
    "  ticket_id INT NOT NULL,"
    "  user_id INT NOT NULL,"
    "  message TEXT NOT NULL,"
    "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
    "  FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id),"
    "  FOREIGN KEY (user_id) REFERENCES Users(user_id)"
    ")"
)

TABLES['OfficeHours'] = (
    "CREATE TABLE IF NOT EXISTS OfficeHours ("
    "  officehours_id SERIAL PRIMARY KEY,"
    "  ta_id INT NOT NULL,"
    "  office_hours JSONB NOT NULL,"
    "  FOREIGN KEY (ta_id) REFERENCES Users(user_id)"
    ")"
)

try:
    conn = psycopg2.connect(connection_string)
    cursor = conn.cursor()

    for table in TABLES:
        table_desc = TABLES[table]
        try:
            print(f"Creating {table}: ", end='')
            cursor.execute(table_desc)
            print("Done")TABLES['OfficeHours'] = (
    "CREATE TABLE IF NOT EXISTS OfficeHours ("
    "  officehours_id SERIAL PRIMARY KEY,"
    "  ta_id INT NOT NULL,"
    "  office_hours JSONB NOT NULL,"
    "  FOREIGN KEY (ta_id) REFERENCES Users(user_id)"
    ")"
)
        except Exception as err:
            print(f"Error: {err}")

    conn.commit()
    cursor.close()
    conn.close()

except Exception as err:
    print(f"Error: {err}")
