import { Router } from "express";
import { db } from "../db/db.js";
import verifieToken from "../middleware/auth.middleware.js";

const router = Router();

// 🔔 récupérer notifications utilisateur connecté
router.get("/", verifieToken, async (req, res) => {
  try {
    const notifications = await db.all(
      `SELECT * FROM notifications 
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 🔔 marquer comme lues
router.put("/read", verifieToken, async (req, res) => {
  await db.run(
    "UPDATE notifications SET lu = 1 WHERE user_id = ?",
    [req.user.userId]
  );

  res.json({ message: "Notifications lues" });
});

export default router;