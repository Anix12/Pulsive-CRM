import CryptoJS from 'crypto-js';
import { env } from '@/config/env';

export const encrypt = (plaintext: string): string => {
  return CryptoJS.AES.encrypt(plaintext, env.ENCRYPTION_KEY).toString();
};

export const decrypt = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const generateApiKey = (): { raw: string; prefix: string } => {
  const raw = `crm_${CryptoJS.lib.WordArray.random(32).toString()}`;
  return { raw, prefix: raw.substring(0, 12) };
};

export const hashApiKey = (raw: string): string => {
  return CryptoJS.SHA256(raw).toString();
};
