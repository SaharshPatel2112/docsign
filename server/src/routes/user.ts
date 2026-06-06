import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

const router = Router();

router.get("/me", requireAuth, (req: AuthRequest, res) => {
  res.json({ userId: req.userId });
});

export default router;
