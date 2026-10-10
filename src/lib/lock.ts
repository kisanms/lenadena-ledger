// Device-level app lock: 4-digit PIN (hashed).
const PIN_KEY = "ld_pin_hash";
const BIO_KEY = "ld_bio_cred";
const UNLOCK_KEY = "ld_unlocked";

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));

async function hash(pin: string, uid: string) {
  const data = new TextEncoder().encode(`lenadena:${uid}:${pin}`);
  return b64(await crypto.subtle.digest("SHA-256", data));
}

export const hasPin = () => !!localStorage.getItem(PIN_KEY);
export async function setPin(pin: string, uid: string) {
  localStorage.setItem(PIN_KEY, await hash(pin, uid));
  markUnlocked();
}
export async function checkPin(pin: string, uid: string) {
  return localStorage.getItem(PIN_KEY) === (await hash(pin, uid));
}
export function clearLock() {
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(BIO_KEY);
  sessionStorage.removeItem(UNLOCK_KEY);
}
export const isUnlocked = () => sessionStorage.getItem(UNLOCK_KEY) === "1";
export const markUnlocked = () => sessionStorage.setItem(UNLOCK_KEY, "1");
