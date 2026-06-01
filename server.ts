import dotenv from "dotenv";
import path from "path";
import express from "express";
import app from "./server/app";
import { initFirebase } from "./server/lib/firebase";

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  initFirebase().then(firebase => {
    if (firebase) console.log("Firebase connected");
  });
});
