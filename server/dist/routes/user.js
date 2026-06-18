"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.get("/me", requireAuth_1.requireAuth, (req, res) => {
    res.json({ userId: req.userId });
});
exports.default = router;
