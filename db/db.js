import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const FICHIER_BD = process.env.DB_FILE || "./data/app.db";
const repertoireBd = path.dirname(FICHIER_BD);

// Crée le répertoire de la base de données s'il n'existe pas encore
if (repertoireBd && repertoireBd !== "." && !existsSync(repertoireBd)) {
  mkdirSync(repertoireBd, { recursive: true });
}

const db = await open({
  filename: FICHIER_BD,
  driver: sqlite3.Database,
});

// Active les clés étrangères (désactivées par défaut dans SQLite)
await db.exec(`PRAGMA foreign_keys = ON;`);

// ─── TABLE UTILISATEURS ───────────────────────────────────────────────────────
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name  TEXT    NOT NULL,
    last_name   TEXT    NOT NULL,
    city        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    phone       TEXT    NOT NULL,
    password    TEXT    NOT NULL,
    role        TEXT NOT NULL DEFAULT 'passager',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── TABLE TRAJETS ────────────────────────────────────────────────────────────
await db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    conducteur_id          INTEGER NOT NULL,

    -- Itinéraire
    lieu_depart            TEXT    NOT NULL,
    lieu_arrivee           TEXT    NOT NULL,

    -- Horaire
    date_depart            TEXT    NOT NULL,   -- format AAAA-MM-JJ
    heure_depart           TEXT    NOT NULL,   -- format HH:MM
    type_trajet            TEXT    NOT NULL    -- 'unique' | 'recurrent'
                             CHECK (type_trajet IN ('unique', 'recurrent')),

    -- Capacités
    nb_places_total        INTEGER NOT NULL,
    nb_places_restantes    INTEGER NOT NULL,

    -- Tarif
    prix_par_place         REAL    NOT NULL,

    -- Préférences (texte libre, ex. : "Aucun bagage", "3 personnes")
    options_bagages        TEXT,
    options_places_arriere TEXT,
    options_autres         TEXT,   -- ex. : "Pneus d'hiver,Vélos,Animaux"

    -- Mode de réservation
    mode_reservation       TEXT    NOT NULL DEFAULT 'demande',
                             -- 'demande' | 'instantanee'

    -- Description libre du conducteur
    description            TEXT,

    -- Détails du véhicule
    modele_vehicule        TEXT,
    couleur_vehicule       TEXT,
    annee_vehicule         INTEGER,
    plaque_immatriculation TEXT,

    -- Statut courant du trajet
    statut                 TEXT    NOT NULL DEFAULT 'ouvert',
                             -- 'ouvert' | 'complet' | 'annule'

    created_at             TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (conducteur_id) REFERENCES users(id)
  );
`);

// ─── TABLE RÉSERVATIONS ───────────────────────────────────────────────────────
await db.exec(`
  CREATE TABLE IF NOT EXISTS reservations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    trajet_id           INTEGER NOT NULL,
    passager_id         INTEGER NOT NULL,
    nb_places_reservees INTEGER NOT NULL DEFAULT 1,
    statut              TEXT    NOT NULL DEFAULT 'en_attente',
                          -- 'en_attente' | 'acceptee' | 'refusee' | 'annulee'
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (trajet_id)  REFERENCES trips(id),
    FOREIGN KEY (passager_id) REFERENCES users(id)
  );
`);

//------------Table Notification
await db.exec(`
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  lu INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

export { db };