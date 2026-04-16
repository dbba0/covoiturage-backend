import { Router } from "express";
import { db } from "../db/db.js";

const router = Router();

// 🔹 Liste de tous les utilisateurs
router.get("/users", async (req, res) => {
  try {
    const users = await db.all(
      "SELECT id, first_name, last_name, email, role, active FROM users"
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 🔹 Activer un utilisateur
router.put("/users/:id/activate", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run("UPDATE users SET active = 1 WHERE id = ?", [
      id,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ message: "Utilisateur activé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 🔹 Désactiver un utilisateur
router.put("/users/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run("UPDATE users SET active = 0 WHERE id = ?", [
      id,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ message: "Utilisateur désactivé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 🔹 Liste uniquement des passagers
router.get("/passengers", async (req, res) => {
  try {
    const passengers = await db.all(
      "SELECT id, first_name, last_name, email, active FROM users WHERE role='passager'"
    );
    res.json(passengers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 🔹 Liste uniquement des conducteurs
router.get("/drivers", async (req, res) => {
  try {
    const drivers = await db.all(
      "SELECT id, first_name, last_name, email, active FROM users WHERE role='conducteur'"
    );
    res.json(drivers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;