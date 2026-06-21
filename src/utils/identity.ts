import localforage from 'localforage';
import { encryptData, decryptData } from './crypto';

export interface UserProfile {
  name: string;
  avatarBase64: string | null;
}

const profileStore = localforage.createInstance({
  name: 'ZenVault',
  storeName: 'user_profile',
});

export async function saveEncryptedProfile(name: string, avatarBase64: string | null, cryptoKey: CryptoKey): Promise<void> {
  const profile: UserProfile = { name, avatarBase64 };
  const payload = JSON.stringify(profile);
  const { ciphertext, iv } = await encryptData(payload, cryptoKey);
  
  await profileStore.setItem('profile_data', { ciphertext, iv });
}

export async function getDecryptedProfile(cryptoKey: CryptoKey): Promise<UserProfile | null> {
  const encryptedProfile = await profileStore.getItem<{ ciphertext: string; iv: string }>('profile_data');
  if (!encryptedProfile) return null;

  try {
    const decryptedJson = await decryptData(encryptedProfile.ciphertext, encryptedProfile.iv, cryptoKey);
    return JSON.parse(decryptedJson) as UserProfile;
  } catch (error) {
    console.error("Failed to decrypt user profile:", error);
    return null;
  }
}
