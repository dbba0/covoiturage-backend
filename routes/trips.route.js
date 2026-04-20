import { Router } from "express";
import { db } from "../db/db.js";
import verifieToken from "../middleware/auth.middleware.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// 1) CRÉER UN TRAJET
//    POST /api/trips
//    Corps attendu : DonneesCreationTrajet (voir interface TypeScript côté front)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", verifieToken, async (requete, reponse) => {
  const conducteurId = requete.user.userId;

  const {
    lieuDepart,
    lieuArrivee,
    dateDepart,
    heureDepart,
    typeTrajet,
    nbPlacesTotal,
    prixParPlace,
    optionsBagages,
    optionsPlacesArriere,
    optionsAutres,
    modeReservation,
    description,
    modeleVehicule,
    couleurVehicule,
    anneeVehicule,
    plaqueImmatriculation,
    statut
  } = requete.body;

  // Validation des champs obligatoires
 const prix = Number(prixParPlace);
const places = Number(nbPlacesTotal);

if (!lieuDepart || !lieuArrivee || !dateDepart || !heureDepart || !typeTrajet || Number.isNaN(places) || Number.isNaN(prix)) { 
    return reponse.status(400).json({
      erreur: "Les champs lieu de départ, lieu d'arrivée, date, heure, type de trajet, places et prix sont obligatoires.",
    });
  }

  try {
    const resultat = await db.run(
      `INSERT INTO trips (
        conducteur_id, lieu_depart, lieu_arrivee,
        date_depart, heure_depart, type_trajet,
        nb_places_total, nb_places_restantes, prix_par_place,
        options_bagages, options_places_arriere, options_autres,
        mode_reservation, description,
        modele_vehicule, couleur_vehicule, annee_vehicule, plaque_immatriculation,
        statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conducteurId,
        lieuDepart, lieuArrivee,
        dateDepart, heureDepart, typeTrajet,
        nbPlacesTotal,
        nbPlacesTotal, // toutes les places sont libres à la création
        prixParPlace,
        optionsBagages || null,
        optionsPlacesArriere || null,
        optionsAutres || null,
        modeReservation || "demande",
        description || null,
        modeleVehicule || null,
        couleurVehicule || null,
        anneeVehicule || null,
        plaqueImmatriculation || null,
        "ouvert"
      ]
    );

    const trajetCree = await db.get("SELECT * FROM trips WHERE id = ?", [resultat.lastID]);

    return reponse.status(201).json({
      message: "Trajet créé avec succès.",
      trajet: trajetCree,
    });
  } catch (erreur) {
    console.error("Erreur création trajet :", erreur);
    return reponse.status(500).json({ erreur: "Impossible de créer le trajet.", detail: String(erreur), code: erreur?.code });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) MES TRAJETS (conducteur connecté)
//    GET /api/trips/mes-trajets
// ─────────────────────────────────────────────────────────────────────────────
router.get("/mes-trajets", verifieToken, async (requete, reponse) => {
  const conducteurId = requete.user.userId;

  try {
    const trajets = await db.all(
      `SELECT * FROM trips
       WHERE conducteur_id = ?
       ORDER BY date_depart ASC, heure_depart ASC`,
      [conducteurId]
    );
    return reponse.json({ trajets });
  } catch (erreur) {
    console.error("Erreur récupération mes trajets :", erreur);
    return reponse.status(500).json({ erreur: "Impossible de récupérer vos trajets." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) MODIFIER UN TRAJET
//    PUT /api/trips/:id
//    Seul le conducteur propriétaire peut modifier son trajet.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", verifieToken, async (requete, reponse) => {
  const conducteurId = requete.user.userId;
  const trajetId = Number(requete.params.id);

  const {
    lieuDepart, lieuArrivee, dateDepart, heureDepart, typeTrajet,
    nbPlacesTotal, prixParPlace,
    optionsBagages, optionsPlacesArriere, optionsAutres,
    modeReservation, description,
    modeleVehicule, couleurVehicule, anneeVehicule, plaqueImmatriculation,
  } = requete.body;

  try {
    const trajetActuel = await db.get("SELECT * FROM trips WHERE id = ?", [trajetId]);

    if (!trajetActuel) {
      return reponse.status(404).json({ erreur: "Trajet introuvable." });
    }

    if (trajetActuel.conducteur_id !== conducteurId) {
      return reponse.status(403).json({
        erreur: "Vous ne pouvez modifier que vos propres trajets.",
      });
    }

    if (trajetActuel.statut === "annule") {
      return reponse.status(400).json({ erreur: "Un trajet annulé ne peut pas être modifié." });
    }

    // Recalcule les places restantes si le total a changé
    const nouveauTotal = nbPlacesTotal || trajetActuel.nb_places_total;
    const decalage = nouveauTotal - trajetActuel.nb_places_total;
    const nouvellePlacesRestantes = Math.max(0, trajetActuel.nb_places_restantes + decalage);

    await db.run(
      `UPDATE trips SET
        lieu_depart = ?, lieu_arrivee = ?,
        date_depart = ?, heure_depart = ?, type_trajet = ?,
        nb_places_total = ?, nb_places_restantes = ?, prix_par_place = ?,
        options_bagages = ?, options_places_arriere = ?, options_autres = ?,
        mode_reservation = ?, description = ?,
        modele_vehicule = ?, couleur_vehicule = ?, annee_vehicule = ?, plaque_immatriculation = ?
       WHERE id = ?`,
      [
        lieuDepart || trajetActuel.lieu_depart,
        lieuArrivee || trajetActuel.lieu_arrivee,
        dateDepart || trajetActuel.date_depart,
        heureDepart || trajetActuel.heure_depart,
        typeTrajet || trajetActuel.type_trajet,
        nouveauTotal,
        nouvellePlacesRestantes,
        prixParPlace ?? trajetActuel.prix_par_place,
        optionsBagages ?? trajetActuel.options_bagages,
        optionsPlacesArriere ?? trajetActuel.options_places_arriere,
        optionsAutres ?? trajetActuel.options_autres,
        modeReservation || trajetActuel.mode_reservation,
        description ?? trajetActuel.description,
        modeleVehicule ?? trajetActuel.modele_vehicule,
        couleurVehicule ?? trajetActuel.couleur_vehicule,
        anneeVehicule ?? trajetActuel.annee_vehicule,
        plaqueImmatriculation ?? trajetActuel.plaque_immatriculation,
        trajetId,
      ]
    );

    const trajetMisAJour = await db.get("SELECT * FROM trips WHERE id = ?", [trajetId]);

    return reponse.json({
      message: "Trajet mis à jour avec succès.",
      trajet: trajetMisAJour,
    });
  } catch (erreur) {
    console.error("Erreur modification trajet :", erreur);
    return reponse.status(500).json({ erreur: "Impossible de modifier ce trajet." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) ANNULER UN TRAJET
//    PATCH /api/trips/:id/annuler
//    Passe le statut à 'annule' et annule toutes les réservations liées.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/annuler", verifieToken, async (requete, reponse) => {
  const conducteurId = requete.user.userId;
  const trajetId = Number(requete.params.id);

  try {
    const trajet = await db.get("SELECT * FROM trips WHERE id = ?", [trajetId]);

    if (!trajet) {
      return reponse.status(404).json({ erreur: "Trajet introuvable." });
    }

    if (trajet.conducteur_id !== conducteurId) {
      return reponse.status(403).json({
        erreur: "Vous ne pouvez annuler que vos propres trajets.",
      });
    }

    if (trajet.statut === "annule") {
      return reponse.status(400).json({ erreur: "Ce trajet est déjà annulé." });
    }

    // Annuler le trajet
    await db.run("UPDATE trips SET statut = 'annule' WHERE id = ?", [trajetId]);

    // Annuler également toutes les réservations en attente / acceptées
    await db.run(
      `UPDATE reservations SET statut = 'annulee'
       WHERE trajet_id = ? AND statut IN ('en_attente', 'acceptee')`,
      [trajetId]
    );

    return reponse.json({
      message: "Trajet annulé. Toutes les réservations associées ont été annulées.",
    });
  } catch (erreur) {
    console.error("Erreur annulation trajet :", erreur);
    return reponse.status(500).json({ erreur: "Impossible d'annuler ce trajet." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5) RECHERCHER DES TRAJETS (page Rechercher)
//    GET /api/trips/recherche?depart=Ottawa&arrivee=Montréal&date=2026-04-15
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recherche", async (req, res) => {
  const { depart, arrivee, date } = req.query;

  try {
    let query = "SELECT * FROM trips WHERE statut = 'ouvert'";
    let params = [];

    if (depart) {
      query += " AND lieu_depart LIKE ?";
      params.push(`%${depart}%`);
    }

    if (arrivee) {
      query += " AND lieu_arrivee LIKE ?";
      params.push(`%${arrivee}%`);
    }

    if (date) {
      query += " AND date_depart = ?";
      params.push(date);
    }

    const trajets = await db.all(query, params);

    res.json({ trajets });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: "Erreur recherche" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6) DÉTAIL D'UN TRAJET
//    GET /api/trips/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", async (requete, reponse) => {
  const trajetId = Number(requete.params.id);

  try {
    const trajet = await db.get(
      `SELECT t.*, u.first_name, u.last_name, u.city, u.phone
       FROM trips t
       JOIN users u ON u.id = t.conducteur_id
       WHERE t.id = ?`,
      [trajetId]
    );

    if (!trajet) {
      return reponse.status(404).json({ erreur: "Trajet introuvable." });
    }

    return reponse.json({ trajet });
  } catch (erreur) {
    console.error("Erreur détail trajet :", erreur);
    return reponse.status(500).json({ erreur: "Impossible de récupérer ce trajet." });
  }
  console.log("TRAJET:", trajet);
  console.log("USER:", passagerId);
  console.log("PLACES:", places);
});

export default router;