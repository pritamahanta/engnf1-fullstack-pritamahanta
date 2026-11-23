import express from "express";
import { cors } from "./middlewares/cors.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.js";

const app = express();

app.use(cors);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;