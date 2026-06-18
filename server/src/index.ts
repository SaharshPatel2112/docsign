import "./env";
import express from "express";
import cors from "cors";
import userRouter from "./routes/user";
import documentsRouter from "./routes/documents";
import signaturesRouter from "./routes/signatures";
import shareRouter from "./routes/share";
import auditRouter from "./routes/audit";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", process.env.FRONTEND_URL || ""],
    credentials: true,
  }),
);

app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/user", userRouter);
app.use("/api/docs", documentsRouter);
app.use("/api/signatures", signaturesRouter);
app.use("/api/share", shareRouter);
app.use("/api/audit", auditRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
