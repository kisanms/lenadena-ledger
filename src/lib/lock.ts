// Device-level app lock: 4-digit PIN (hashed) + optional platform biometrics (WebAuthn).
const PIN_KEY = "ld_pin_hash";
const BIO_KEY = "ld_bio_cred";
const UNLOCK_KEY = "ld_unlocked";

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

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

export const hasBiometric = () => !!localStorage.getItem(BIO_KEY);
export async function biometricSupported() {
  try {
    return (
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}
export async function registerBiometric(email: string) {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "LenaDena", id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: email, displayName: email },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Biometric setup cancelled");
  localStorage.setItem(BIO_KEY, b64(cred.rawId));
}
export async function verifyBiometric() {
  const id = localStorage.getItem(BIO_KEY);
  if (!id) return false;
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: unb64(id), transports: ["internal"] }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return !!res;
}
export const disableBiometric = () => localStorage.removeItem(BIO_KEY);
