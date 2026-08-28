import * as ftp from "basic-ftp";
import fs from "fs";
import path from "path";
import { initFirebase } from "../lib/firebase";
import { getSmtpTransport } from "../lib/mailer";


export class GeneralService {
  static async uploadFtp(file: any, folder: string): Promise<{ success: boolean; url: string; name: string }> {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("storage").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const ftpHost    = config?.host      || process.env.FTP_SERVER;
    const ftpUser    = config?.user      || process.env.FTP_USERNAME;
    const ftpPass    = config?.password  || process.env.FTP_PASSWORD;
    const baseFolder = config?.folder    || process.env.FTP_FOLDER   || "promptly/public/";
    const publicUrl  = config?.publicUrl || process.env.FTP_PUBLIC_URL || "";
    const secure     = config?.secure === "true";

    if (!ftpHost || !ftpUser || !ftpPass) throw new Error("FTP credentials not configured");

    const client = new ftp.Client();
    try {
      await client.access({ host: ftpHost, user: ftpUser, password: ftpPass, secure });

      const ext        = path.extname(file.originalFilename || file.path || "");
      const filename   = `${Date.now()}${ext}`;
      const subPath    = folder ? `${folder}/` : "";
      const remotePath = `${baseFolder}${subPath}${filename}`;

      await client.uploadFrom(file.path, remotePath);

      const url = publicUrl
        ? `${publicUrl.replace(/\/$/, "")}/${subPath}${filename}`
        : remotePath;

      return { success: true, url, name: filename };
    } finally {
      client.close();
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  }

  static async testFtp(params: {
    host?: string;
    user?: string;
    password?: string;
    secure?: boolean;
  }): Promise<{ ok: boolean; message: string }> {
    const client = new ftp.Client();
    try {
      await client.access({
        host:     params.host     || process.env.FTP_SERVER,
        user:     params.user     || process.env.FTP_USERNAME,
        password: params.password || process.env.FTP_PASSWORD,
        secure:   params.secure === true,
      });
      return { ok: true, message: "FTP connection successful" };
    } catch (err: any) {
      return { ok: false, message: err.message };
    } finally {
      client.close();
    }
  }

  static async testEmail(): Promise<{ ok: boolean; message: string }> {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const smtp = await getSmtpTransport(firebase.db);
    if (!smtp) throw new Error("SMTP not configured");

    await smtp.transport.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: smtp.fromEmail,
      subject: "Promptly — Test Email",
      text: "If you see this, your SMTP configuration is working correctly.",
    });

    return { ok: true, message: `Test email sent to ${smtp.fromEmail}` };
  }

}
