import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { Transform } from "stream";

@Injectable()
export class CryptoService {
  // Using AES-256-GCM which provides authenticated encryption
  private readonly algorithm = "aes-256-gcm";
  private readonly ivLength = 16; // 128 bits IV (16 bytes)
  private readonly saltLength = 32; // 256 bits salt (32 bytes)
  private readonly tagLength = 16; // 128 bits tag (16 bytes)

  // For this demo, we use a fallback key if ENCRYPTION_KEY isn't found.
  // In production, ENCRYPTION_KEY must be exactly 32 bytes (256 bits).
  private getMasterKey(): Buffer {
    const keyString =
      process.env.ENCRYPTION_KEY || "SuperSecretMasterKeyForABAApp123!";
    // Ensure key is exactly 32 bytes
    return crypto.scryptSync(keyString, "aba-salt", 32);
  }

  // ============================================
  // FIELD LEVEL ENCRYPTION (Strings / DB Fields)
  // ============================================

  /**
   * Encrypts a string using AES-256-GCM.
   * Returns a formatted payload: "v1:base64(iv):base64(authTag):base64(encryptedData)"
   */
  encryptString(text: string): string {
    if (!text) return text; // Don't encrypt empty/null

    const iv = crypto.randomBytes(this.ivLength);
    const key = this.getMasterKey();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  }

  /**
   * Decrypts a formatted payload: "v1:base64(iv):base64(authTag):base64(encryptedData)"
   * If it doesn't match the format, returns the original string.
   */
  decryptString(encryptedText: string): string {
    if (!encryptedText || !encryptedText.startsWith("v1:")) {
      return encryptedText; // Not encrypted or wrong format
    }

    try {
      const parts = encryptedText.split(":");
      if (parts.length !== 4) return encryptedText;

      const [version, ivBase64, authTagBase64, encryptedData] = parts;
      const iv = Buffer.from(ivBase64, "base64");
      const authTag = Buffer.from(authTagBase64, "base64");
      const key = this.getMasterKey();

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, "base64", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error(
        "Decryption failed for a field. Returning original.",
        error,
      );
      // In a strict environment, you might throw here.
      // For safety if key rotates/mismatches without rotation strategy, returning original or "" is safer.
      return encryptedText;
    }
  }

  // ============================================
  // STREAM ENCRYPTION (Video Files at Rest)
  // ============================================

  /**
   * Generates a unique 32-byte key and 16-byte IV for a new file.
   */
  generateFileCredentials(): { key: Buffer; iv: Buffer } {
    return {
      key: crypto.randomBytes(32),
      iv: crypto.randomBytes(this.ivLength),
    };
  }

  /**
   * Encrypts the specific file key using the Master Key so it can be stored safely in DB.
   */
  encryptFileKey(fileKey: Buffer): string {
    const iv = crypto.randomBytes(this.ivLength);
    const masterKey = this.getMasterKey();
    const cipher = crypto.createCipheriv(this.algorithm, masterKey, iv);

    let encrypted = cipher.update(fileKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  /**
   * Decrypts a stored file key using the Master Key.
   */
  decryptFileKey(encryptedFileKeyPayload: string): Buffer {
    const parts = encryptedFileKeyPayload.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") {
      throw new Error("Invalid encrypted file key payload");
    }

    const iv = Buffer.from(parts[1], "base64");
    const authTag = Buffer.from(parts[2], "base64");
    const encryptedKey = Buffer.from(parts[3], "base64");
    const masterKey = this.getMasterKey();

    const decipher = crypto.createDecipheriv(this.algorithm, masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedKey);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  /**
   * Returns a transform stream that decrypts the incoming file stream on the fly.
   */
  createDecryptStream(fileKey: Buffer, iv: Buffer, authTag: Buffer): Transform {
    const decipher = crypto.createDecipheriv(this.algorithm, fileKey, iv);
    decipher.setAuthTag(authTag);
    return decipher;
  }
}
