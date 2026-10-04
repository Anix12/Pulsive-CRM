const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, name: user.name, company: user.company, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

router.post("/signup", async (req, res) => {
  const { name, company, email, password } = req.body;
  if (!name || !company || !email || !password) {
    return res.status(400).json({ error: "name, company, email and password are all required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const id = "user_" + nanoid(12);
  const passwordHash = await bcrypt.hash(password, 10);
  db.prepare("INSERT INTO users (id, name, company, email, password_hash) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, company, email.toLowerCase(), passwordHash);

  const user = { id, name, company, email: email.toLowerCase() };
  res.status(201).json({ token: signToken(user), user });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!row) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const user = { id: row.id, name: row.name, company: row.company, email: row.email };
  res.json({ token: signToken(user), user });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
