import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/db.js";
import verifieToken from "../middleware/auth.middleware.js";

const router = Router();

/* ============================
   🔹 REGISTER
============================ */
router.post("/register", async (req, res) => {
  const { first_name, last_name, city, email, phone, password, role } = req.body;

  if (!first_name || !last_name || !city || !email || !phone || !password) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  try {
    const exist = await db.get("SELECT id FROM users WHERE email = ?", [email]);
    if (exist) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✔ rôle choisi ou par défaut "passager"
    const roleInitial = ["conducteur", "passager"].includes(role)
      ? role
      : "passager";

    await db.run(
      `INSERT INTO users 
       (first_name, last_name, city, email, phone, password, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, city, email, phone, hashedPassword, roleInitial]
    );

    return res.status(201).json({ message: "Compte créé avec succès." });

  } catch (err) {
    console.error("Erreur register:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/* ============================
   🔹 LOGIN
============================ */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe obligatoires." });
  }

  try {
    // Admin
    if (email === "admin@lacite.ca" && password === "Admin123") {
      const token = jwt.sign(
        { userId: 0, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.json({
        message: "Connexion admin réussie",
        token,
        user: {
          id: 0,
          first_name: "Admin",
          last_name: "System",
          email,
          role: "admin",
        },
      });
    }

    const utilisateur = await db.get(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!utilisateur) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    if (utilisateur.active === 0) {
      return res.status(403).json({
        error: "Votre compte a été bloqué, veuillez contacter l'administrateur",
        adminEmail: "admin@lacite.ca"
      });
    }

    const motDePasseValide = await bcrypt.compare(password, utilisateur.password);
    if (!motDePasseValide) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const token = jwt.sign(
      { userId: utilisateur.id, role: utilisateur.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const { password: _, ...userSansPassword } = utilisateur;

    return res.json({
      message: "Connexion réussie",
      token,
      user: userSansPassword,
    });

  } catch (err) {
    console.error("Erreur login:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/* ============================
   🔹 GET ME
============================ */
router.get("/me", verifieToken, async (req, res) => {
  try {
    const utilisateur = await db.get(
      `SELECT id, first_name, last_name, city, email, phone, active, role
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    if (!utilisateur) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    return res.json({ user: utilisateur });

  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;