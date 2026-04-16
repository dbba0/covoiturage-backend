import { Router } from "express";
import { db } from "../db/db.js";
import verifieToken from "../middleware/auth.middleware.js";

const router = Router();


// ─────────────────────────────────────────
// 1) RÉSERVER UN TRAJET
// ─────────────────────────────────────────
router.post("/:id/reserver", verifieToken, async (req, res) => {
  const trajetId = Number(req.params.id);
  const passagerId = req.user.userId;
  const places = Number(req.body.nbPlaces) || 1;

  try {
    const trajet = await db.get("SELECT * FROM trips WHERE id = ?", [trajetId]);
    console.log("TRIP DEBUG:", trajet);
console.log("STATUT:", trajet?.statut);
console.log("PLACES:", trajet?.nb_places_restantes);
console.log("PASSAGER:", passagerId);
console.log("CONDUCTEUR:", trajet?.conducteur_id);
console.log("REQUEST PLACES:", places);
    if (!trajet) return res.status(404).json({ erreur: "Trajet introuvable." });

    if (trajet.statut === "annule") {
        return res.status(400).json({ erreur: "Trajet annulé." });
      }

      if ((trajet.nb_places_restantes ?? 0) <= 0) {
        return res.status(400).json({ erreur: "Plus de places disponibles." });
      }

    if (trajet.conducteur_id === passagerId) {
      return res.status(400).json({ erreur: "Impossible de réserver votre trajet." });
    }

    if (places <= 0) {
      return res.status(400).json({ erreur: "Nombre de places invalide." });
    }

    if ((trajet.nb_places_restantes ?? 0) < places) {
      return res.status(400).json({ erreur: "Pas assez de places." });
    }

    const dejaReserve = await db.get(
      `SELECT * FROM reservations 
       WHERE trajet_id = ? AND passager_id = ? AND statut != 'annulee'`,
      [trajetId, passagerId]
    );

    if (dejaReserve) {
      return res.status(400).json({ erreur: "Déjà réservé." });
    }

    const statut =
      trajet.mode_reservation === "instantanee"
        ? "acceptee"
        : "en_attente";

    await db.run(
      `INSERT INTO reservations (trajet_id, passager_id, nb_places_reservees, statut)
       VALUES (?, ?, ?, ?)`,
      [trajetId, passagerId, places, statut]
    );

    // 🔻 si instantané → décrémenter places
    if (statut === "acceptee") {
      await db.run(
        `UPDATE trips SET nb_places_restantes = nb_places_restantes - ? WHERE id = ?`,
        [places, trajetId]
      );
    }

    // 🔔 NOTIFICATION CONDUCTEUR
    const passager = await db.get(
      "SELECT first_name, last_name FROM users WHERE id = ?",
      [passagerId]
    );

    await db.run(
      `INSERT INTO notifications (user_id, type, message)
       VALUES (?, ?, ?)`,
      [
        trajet.conducteur_id,
        "nouvelle_demande",
        `${passager.first_name} ${passager.last_name} a demandé ${places} place(s)`
      ]
    );

    return res.json({ message: "Réservation effectuée." });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erreur: "Erreur réservation." });
  }
});


// ─────────────────────────────────────────
// 2) MES RÉSERVATIONS
// ─────────────────────────────────────────
router.get("/mes-reservations", verifieToken, async (req, res) => {
  const passagerId = req.user.userId;

  try {
    const reservations = await db.all(
      `SELECT r.*, t.lieu_depart, t.lieu_arrivee, t.date_depart, t.heure_depart
       FROM reservations r
       JOIN trips t ON t.id = r.trajet_id
       WHERE r.passager_id = ?
       ORDER BY r.created_at DESC`,
      [passagerId]
    );

    return res.json({ reservations });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erreur: "Erreur récupération." });
  }
});


// ─────────────────────────────────────────
// 3) ANNULER
// ─────────────────────────────────────────
router.patch("/reservation/:id/annuler", verifieToken, async (req, res) => {
  const reservationId = Number(req.params.id);
  const userId = req.user.userId;

  try {
    const reservation = await db.get(
      "SELECT * FROM reservations WHERE id = ?",
      [reservationId]
    );
    if (!reservation) {
  return res.status(404).json({ erreur: "Réservation introuvable" });
}

    if (!reservation) return res.status(404).json({ erreur: "Introuvable." });

    if (reservation.passager_id !== userId) {
      return res.status(403).json({ erreur: "Non autorisé." });
    }

    await db.run(
      "UPDATE reservations SET statut = 'annulee' WHERE id = ?",
      [reservationId]
    );

    if (reservation.statut === "acceptee") {
      await db.run(
        `UPDATE trips SET nb_places_restantes = nb_places_restantes + ?
         WHERE id = ?`,
        [reservation.nb_places_reservees, reservation.trajet_id]
      );
    }

    // 🔔 notif conducteur
    const trajet = await db.get(
      "SELECT conducteur_id FROM trips WHERE id = ?",
      [reservation.trajet_id]
    );

    await db.run(
      `INSERT INTO notifications (user_id, type, message)
       VALUES (?, ?, ?)`,
      [
        trajet.conducteur_id,
        "annulation",
        "Un passager a annulé sa réservation"
      ]
    );

    return res.json({ message: "Annulée." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: "Erreur annulation." });
  }
});


// ─────────────────────────────────────────
// 4) DEMANDES CONDUCTEUR
// ─────────────────────────────────────────
router.get("/driver", verifieToken, async (req, res) => {
  const conducteurId = req.user.userId;

  try {
    const demandes = await db.all(
      `SELECT r.*, u.first_name, u.last_name, t.lieu_depart, t.lieu_arrivee
       FROM reservations r
       JOIN trips t ON r.trajet_id = t.id
       JOIN users u ON u.id = r.passager_id
       WHERE t.conducteur_id = ?
       AND r.statut = 'en_attente'
       ORDER BY r.created_at DESC`,
      [conducteurId]
    );

    res.json({ demandes });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: "Erreur demandes" });
  }
});


// ─────────────────────────────────────────
// 5) ACCEPTER
// ─────────────────────────────────────────
router.patch("/:id/accepter", verifieToken, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const reservation = await db.get(
      "SELECT * FROM reservations WHERE id = ?",
      [id]
    );

    const trip = await db.get(
      "SELECT * FROM trips WHERE id = ?",
      [reservation.trajet_id]
    );
    if (!trip) {
  return res.status(404).json({ erreur: "Trajet introuvable" });
}

    if (trip.conducteur_id !== req.user.userId) {
      return res.status(403).json({ erreur: "Non autorisé" });
    }

    await db.run(
      "UPDATE reservations SET statut = 'acceptee' WHERE id = ?",
      [id]
    );

    await db.run(
      `UPDATE trips SET nb_places_restantes = nb_places_restantes - ?
       WHERE id = ?`,
      [reservation.nb_places_reservees, reservation.trajet_id]
    );

    // 🔔 notif passager
    await db.run(
      `INSERT INTO notifications (user_id, type, message)
       VALUES (?, ?, ?)`,
      [
        reservation.passager_id,
        "acceptee",
        "Votre réservation a été acceptée"
      ]
    );

    res.json({ message: "Acceptée" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: "Erreur acceptation" });
  }
});


// ─────────────────────────────────────────
// 6) REFUSER
// ─────────────────────────────────────────
router.patch("/:id/refuser", verifieToken, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const reservation = await db.get(
      "SELECT * FROM reservations WHERE id = ?",
      [id]
    );

    const trip = await db.get(
      "SELECT * FROM trips WHERE id = ?",
      [reservation.trajet_id]
    );

    if (trip.conducteur_id !== req.user.userId) {
      return res.status(403).json({ erreur: "Non autorisé" });
    }

    await db.run(
      "UPDATE reservations SET statut = 'refusee' WHERE id = ?",
      [id]
    );

    // 🔔 notif passager
    await db.run(
      `INSERT INTO notifications (user_id, type, message)
       VALUES (?, ?, ?)`,
      [
        reservation.passager_id,
        "refusee",
        "Votre réservation a été refusée"
      ]
    );

    res.json({ message: "Refusée" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: "Erreur refus" });
  }
});


// ─────────────────────────────────────────
// 7) MES TRAJETS (demandes par trajet)
// ─────────────────────────────────────────
router.get("/trip/:id", verifieToken, async (req, res) => {
  const trajetId = Number(req.params.id);
  const conducteurId = req.user.userId;

  try {
    const demandes = await db.all(
      `SELECT r.id, r.statut, r.nb_places_reservees,
              u.first_name, u.last_name,
              t.lieu_depart, t.lieu_arrivee
       FROM reservations r
       JOIN users u ON u.id = r.passager_id
       JOIN trips t ON t.id = r.trajet_id
       WHERE r.trajet_id = ? AND t.conducteur_id = ?`,
      [trajetId, conducteurId]
    );

    res.json({ demandes });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});

export default router;