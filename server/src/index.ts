import "./env";
import express from "express";
import cors from "cors";
import userRouter from "./routes/user";
import documentsRouter from "./routes/documents";
import signaturesRouter from "./routes/signatures";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/user", userRouter);
app.use("/api/docs", documentsRouter);
app.use("/api/signatures", signaturesRouter);

app.listen(5000, () => console.log("Server running on port 5000"));
