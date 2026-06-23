// src/index.ts
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import express from "express";
import cors from "cors";

import ticketsRouter from "./routes/tickets";
import machinesRouter from "./routes/machines";
import aiRouter from "./routes/ai";
import dashboardRouter from "./routes/dashboard";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import purchasesRouter from "./routes/purchases";
import needlesRouter from "./routes/needles";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// basic health check (frontend owns "/" in production, see below)
app.get("/health", (req, res) => {
  res.send("FM Support Backend Prototype is running.");
});

app.use("/public", express.static("public"));

// API routes
app.use("/tickets", ticketsRouter);
app.use("/machines", machinesRouter);
app.use("/ai", aiRouter);
app.use("/dashboard", dashboardRouter);
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/purchases", purchasesRouter);
app.use("/needles", needlesRouter);

// Serve the built frontend (npm run build) so the whole app is reachable
// from a single URL/port — needed for hosting on Render etc. In local dev,
// this folder won't exist yet and is silently skipped.
const frontendDist = path.join(__dirname, "..", "fm-support-frontend", "dist");
app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});