import { bufferToBase64, base64ToBuffer } from './crypto';

const CHALLENGE_SIZE = 32;

function getChallenge() {
  return window.crypto.getRandomValues(new Uint8Array(CHALLENGE_SIZE));
}

function getUserId() {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

// A constant salt used for PRF evaluation to derive the same key consistently
const PRF_SALT = new TextEncoder().encode("ZenVault_Biometric_Seed_Salt_v1");
// Pad the salt to 32 bytes (required by WebAuthn PRF extension)
const paddedSalt = new Uint8Array(32);
paddedSalt.set(PRF_SALT);

export async function isWebAuthnPrfSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return isAvailable;
  } catch (e) {
    return false;
  }
}

export async function registerBiometricVault(): Promise<{ credentialId: string }> {
  if (!(await isWebAuthnPrfSupported())) {
    throw new Error("Platform authenticator not available or supported.");
  }

  const userId = getUserId();
  const challenge = getChallenge();

  const createOptions: PublicKeyCredentialCreationOptions = {
    rp: { name: "ZenVault AI", id: window.location.hostname },
    user: {
      id: userId,
      name: "zenvault-user",
      displayName: "ZenVault User"
    },
    challenge: challenge,
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },  // ES256
      { type: "public-key", alg: -257 } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "required" // Required for PRF on some platforms
    },
    extensions: {
      prf: {
        eval: {
          first: paddedSalt
        }
      }
    } as any // TS definitions for WebAuthn extensions are often incomplete
  };

  const credential = await navigator.credentials.create({
    publicKey: createOptions
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Credential creation failed or was canceled.");
  }

  return { credentialId: bufferToBase64(credential.rawId) };
}

export async function unlockWithBiometrics(credentialIdBase64: string): Promise<Uint8Array> {
  const challenge = getChallenge();
  const credentialId = base64ToBuffer(credentialIdBase64);

  const getOptions: PublicKeyCredentialRequestOptions = {
    challenge: challenge,
    allowCredentials: [
      {
        id: credentialId,
        type: "public-key",
      }
    ],
    userVerification: "required",
    extensions: {
      prf: {
        eval: {
          first: paddedSalt
        }
      }
    } as any
  };

  const assertion = await navigator.credentials.get({
    publicKey: getOptions
  }) as any;

  if (!assertion) {
    throw new Error("Credential assertion failed or was canceled.");
  }

  const extensionResults = assertion.getClientExtensionResults();
  
  if (extensionResults.prf && extensionResults.prf.results && extensionResults.prf.results.first) {
    const prfOutput = new Uint8Array(extensionResults.prf.results.first);
    return prfOutput;
  } else {
    throw new Error("WebAuthn PRF extension is not supported by this authenticator/browser. Cannot derive encryption key.");
  }
}
