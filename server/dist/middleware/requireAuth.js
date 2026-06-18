"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const token = authHeader.split(" ")[1];
        const parts = token.split(".");
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        console.log("Token payload keys:", Object.keys(payload));
        console.log("Email from token:", payload.email);
        if (!payload.sub) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }
        req.userId = payload.sub;
        req.userEmail = payload.email || payload.sub;
        next();
    }
    catch (err) {
        res.status(401).json({ error: "Unauthorized" });
    }
};
exports.requireAuth = requireAuth;
