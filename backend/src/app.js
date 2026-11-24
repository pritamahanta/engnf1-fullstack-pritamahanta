import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import { cors } from "./middlewares/cors.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.js";
import ticketRoutes from "./routes/tickets.js";
import statsRoutes from "./routes/stats.js";
import resourceRoutes from "./routes/resources.js";
import bookingRoutes from "./routes/bookings.js";
import adminRoutes from "./routes/admin.js";

const app = express();

app.use(cors);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

const frontendDir = fileURLToPath(new URL("../../frontend/dist/", import.meta.url));
const frontendIndex = fileURLToPath(new URL("../../frontend/dist/index.html", import.meta.url));

if (existsSync(frontendIndex)) {
  app.use(express.static(frontendDir));
  app.get(/^(?!\/(?:api|assets|health)(?:\/|$)).*$/i, (req, res, next) => {
    if (!req.accepts("html")) return next();
    res.sendFile(frontendIndex);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;