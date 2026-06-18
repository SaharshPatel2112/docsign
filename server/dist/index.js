"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./env");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const user_1 = __importDefault(require("./routes/user"));
const documents_1 = __importDefault(require("./routes/documents"));
const signatures_1 = __importDefault(require("./routes/signatures"));
const share_1 = __importDefault(require("./routes/share"));
const audit_1 = __importDefault(require("./routes/audit"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", process.env.FRONTEND_URL || ""],
    credentials: true,
}));
app.use(express_1.default.json());
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/user", user_1.default);
app.use("/api/docs", documents_1.default);
app.use("/api/signatures", signatures_1.default);
app.use("/api/share", share_1.default);
app.use("/api/audit", audit_1.default);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
