import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import * as ftp from "basic-ftp";
import multiparty from "multiparty";
import { initFirebase } from "./api/lib/firebase";

// Import Modular Routes
import locationRouter from "./api/routes/location";
import paymentsRouter from "./api/routes/payments";
import authRouter from "./api/routes/auth";
import marketingRouter from "./api/routes/marketing";
import supportRouter from "./api/routes/support";

dotenv.config();

const app = express();
const PORT = 3001;

// Neural Global Parser: Required for reading JSON from frontend
app.use(express.json());

// Neural Request Logger: Diagnostic tool for routing
app.use((req, res, next) => {
  console.log(`📡 [Neural Traffic] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.get("/ping", (req, res) => {
  res.send("PONG - Server is Alive!");
});

console.log("🛰️ [Neural Mount] Registering Modular Routes...");
app.use("/api/location", locationRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/auth", authRouter);
app.use("/api/support", supportRouter);

app.use("/", marketingRouter); // Handles /sitemap.xml and /api/test-email

app.get("/api/health", async (req, res) => {
  const firebase = await initFirebase();
  res.json({
    status: "ok",
    firebase: firebase ? "connected" : "failed"
  });
});

// --- Legacy FTP Vault Logic (To be modularized later) ---
app.post("/api/vault/upload", (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });
    const file = files.file[0];
    const pathOnServer = fields.path[0];

    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
      const firebase = await initFirebase();
      if (!firebase) throw new Error("Firebase not connected");
      const configSnap = await firebase.db.collection("configs").doc("storage").get();
      if (!configSnap.exists) throw new Error("Storage config missing");
      const config = configSnap.data();

      await client.access({
        host: config?.host,
        user: config?.user,
        password: config?.password,
        secure: config?.secure === 'true'
      });
      await client.uploadFrom(file.path, pathOnServer);
      res.json({ success: true, url: `${config?.publicUrl}/${pathOnServer}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    } finally {
      client.close();
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  });
});

// --- Production SPA Routing ---
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

async function startServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Neural Control Tower running on http://localhost:${PORT}`);
    initFirebase().then(res => {
      if (res) console.log("✅ Firebase Engine Synchronized");
    });
  });
}

startServer();
