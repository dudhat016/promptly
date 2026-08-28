import app from "../server/app";

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Serverless Error]:", err);
    return res.status(500).json({ success: false, error: err?.message || "Serverless Error" });
  }
}
