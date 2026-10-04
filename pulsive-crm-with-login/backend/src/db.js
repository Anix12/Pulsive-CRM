const path = require("path");
const fs = require("fs");
// Node's built-in SQLite driver — no native compilation required (unlike
// better-sqlite3, which needs Visual Studio Build Tools on Windows).
// Same synchronous prepare/run/get/all API shape, so nothing else in this
// backend needs to change.
const { DatabaseSync } = require("node:sqlite");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || "./pulsive.db";
const SCHEMA_PATH = path.join(__dirname, "..", "..", "database", "schema.sql");

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

module.exports = db;
