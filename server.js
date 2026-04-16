// Chargement des configurations
import "dotenv/config";

// IMPORTATIONS
import express, { json } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { db } from "./db/db.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.route.js";
import tripsRoutes from "./routes/trips.route.js";
import reservationsRoutes from "./routes/reservations.route.js";
import notificationsRoutes from "./routes/notifications.route.js";

// Création de serveur
const app = express();

// Middlewares 
app.use(helmet()); 
app.use(cors({ origin: "http://localhost:5173" }));
app.use(compression());
app.use(json()); 
app.use(express.static("public")); 
app.use("/api/notifications", notificationsRoutes);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/reservations", reservationsRoutes);

// Route de test 
app.get("/api/health", async (request, response) => {
  const r = await db.get("SELECT 1 as ok");
  response.json({ ok: true, db: r.ok });
});

// Démarrer le serveur 
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré : http://localhost:${PORT}`);
});