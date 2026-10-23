const cors = require("cors");
const { Op } = require("sequelize");
const sequelize = require("./db");
const express = require("express");
const path = require("path");
const httplogger = require("../middleware/httplogger");
const { BugReport } = require("../models");

const FRONTEND_BUILD_PATH = path.join(__dirname, "../../frontend/build");
const AUTO_CLOSE_INTERVAL_MS = 60 * 60 * 1000;
const AUTO_CLOSE_DELAY_MS = 24 * 60 * 60 * 1000;

const autoCloseResolvedBugReports = async () => {
  await BugReport.update(
    { status: "closed" },
    {
      where: {
        status: "resolved",
        updatedAt: {
          [Op.lte]: new Date(Date.now() - AUTO_CLOSE_DELAY_MS),
        },
      },
    }
  );
};

module.exports = (app) => {
  // Setup CORS
  const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    "http://localhost:3001, https://helpdesk.asucapstonetools.com"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests without an Origin header (e.g. curl/postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true, // Enable this for sessions/auth
    })
  );

  // Set up httplogger
  app.use(httplogger);

  // Setup JSON parsing middleware
  app.use(require("express").json());

  // Setup the backend to serve the front end
  app.use(express.static(FRONTEND_BUILD_PATH));

  //Setup database connection
  sequelize
    .authenticate()
    .then(() => {
      console.log("Database connected...");
      return sequelize.sync(); // Syncs models with the database
    })
    .then(async () => {
      await autoCloseResolvedBugReports();
      setInterval(() => {
        autoCloseResolvedBugReports().catch((err) => {
          console.error("Failed to auto-close resolved bug reports:", err);
        });
      }, AUTO_CLOSE_INTERVAL_MS);
    })
    .catch((err) => {
      console.error("Unable to connect to the database:", err);
    });
};
