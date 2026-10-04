require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

// Serve crm.html — this IS the dashboard; the file itself decides
// whether to show the login screen or the app based on whether a
// valid token is in localStorage.
const frontendPath = path.join(__dirname, "..", "..", "frontend");
app.use(express.static(frontendPath));
app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "crm.html")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Pulsive CRM running at http://localhost:${PORT}`));
