import { fromHex, toHex } from './midnight.js';
import { secretBytes } from './stillroom.js';
export type RecoveryKeys = { stewardSecret: string; maintenanceKey: string };
const iterations = 310_000;
async function encryptionKey(password: string, salt: Uint8Array, usage: KeyUsage[]) {
  if (password.length < 12) throw new Error('Use a recovery password of at least 12 characters.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, material, { name: 'AES-GCM', length: 256 }, false, usage);
}
export async function encryptRecovery(keys: RecoveryKeys, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(password, salt, ['encrypt']);
  const data = new TextEncoder().encode(JSON.stringify(keys));
  try {
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.stringify({ format: 'stillroom-recovery-v1', kdf: 'PBKDF2-SHA256', iterations, salt: toHex(salt), iv: toHex(iv), ciphertext: toHex(new Uint8Array(encrypted)) }, null, 2);
  } finally { data.fill(0); }
}
export async function decryptRecovery(text: string, password: string): Promise<RecoveryKeys> {
  const file = JSON.parse(text);
  if (file.format !== 'stillroom-recovery-v1' || file.iterations !== iterations || file.kdf !== 'PBKDF2-SHA256') throw new Error('Unsupported recovery file.');
  const salt = fromHex(file.salt), iv = fromHex(file.iv), ciphertext = fromHex(file.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length > 4096) throw new Error('Invalid recovery file.');
  const key = await encryptionKey(password, salt, ['decrypt']);
  let decoded: ArrayBuffer;
  try { decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ciphertext as BufferSource); }
  catch { throw new Error('Incorrect recovery password or damaged file.'); }
  const data = new Uint8Array(decoded);
  try {
    const keys = JSON.parse(new TextDecoder().decode(data));
    secretBytes(keys.stewardSecret); secretBytes(keys.maintenanceKey);
    return keys;
  } finally { data.fill(0); }
}
export function downloadRecovery(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'stillroom-encrypted-recovery.json'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
