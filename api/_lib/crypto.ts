import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { EncryptedSecret, Provider } from "../../src/types/Server";

// New secrets are encrypted with this key version. To rotate: add
// CREDENTIALS_ENC_KEY_V2, bump this, and re-encrypt the old rows.
const CURRENT_KEY_VERSION = 1;

const keyFor = (version: number) => {
  const encoded = process.env[`CREDENTIALS_ENC_KEY_V${String(version)}`];
  if (!encoded)
    throw new Error(`Encryption key v${String(version)} is not set`);
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32)
    throw new Error(`Encryption key v${String(version)} must be 32 bytes`);
  return key;
};

// Binds a ciphertext to its owner and provider: a row copied to another user
// or provider fails to decrypt.
const associatedData = (userId: string, provider: Provider) =>
  Buffer.from(`${userId}:${provider}`, "utf8");

// AES-256-GCM with a fresh random IV for every encryption.
const encryptSecret = (
  plaintext: string,
  userId: string,
  provider: Provider,
): EncryptedSecret => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(CURRENT_KEY_VERSION), iv);
  cipher.setAAD(associatedData(userId, provider));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext,
    iv,
    authTag: cipher.getAuthTag(),
    keyVersion: CURRENT_KEY_VERSION,
  };
};

// Throws if the data, IV, tag, owner or provider was changed.
const decryptSecret = (
  secret: EncryptedSecret,
  userId: string,
  provider: Provider,
) => {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor(secret.keyVersion),
    secret.iv,
    { authTagLength: 16 },
  );
  decipher.setAAD(associatedData(userId, provider));
  decipher.setAuthTag(secret.authTag);
  return Buffer.concat([
    decipher.update(secret.ciphertext),
    decipher.final(),
  ]).toString("utf8");
};

export { encryptSecret, decryptSecret, CURRENT_KEY_VERSION };
