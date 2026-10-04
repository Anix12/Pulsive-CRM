const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, name: payload.name, company: payload.company, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Session expired or invalid — please log in again" });
  }
}

module.exports = { requireAuth };
