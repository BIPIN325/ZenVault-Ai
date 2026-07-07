"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { deriveKey, generateSalt, bufferToBase64, base64ToBuffer, encryptData, decryptData, importRawKey } from '@/utils/crypto';
import { registerBiometricVault, unlockWithBiometrics, isWebAuthnPrfSupported } from '@/utils/biometrics';

interface AuthContextType {
  cryptoKey: CryptoKey | null;
  isLocked: boolean;
  isFirstSetup: boolean;
  hasBiometrics: boolean;
  unlockVault: (password: string) => Promise<boolean>;
  setupBiometrics: () => Promise<boolean>;
  unlockVaultBiometric: () => Promise<boolean>;
  lockVault: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isFirstSetup, setIsFirstSetup] = useState<boolean>(true);
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if a vault already exists on mount
  useEffect(() => {
    const salt = localStorage.getItem('vault_salt');
    const validator = localStorage.getItem('vault_validator');
    const iv = localStorage.getItem('vault_iv');
    const biometricId = localStorage.getItem('vault_biometric_id');

    if (salt && validator && iv) {
      setIsFirstSetup(false);
    }
    
    if (biometricId) {
      setHasBiometrics(true);
    }
    
    setIsLoading(false);
  }, []);

  const unlockVault = async (password: string): Promise<boolean> => {
    try {
      if (isFirstSetup) {
        // --- INITIAL SETUP ---
        const salt = generateSalt();
        const key = await deriveKey(password, salt);
        
        // Encrypt a known string to use as a password validator in the future
        const { ciphertext, iv } = await encryptData("ZEN_VAULT_VALID", key);
        
        // Save verification data (NOT the password or key) to localStorage
        localStorage.setItem('vault_salt', bufferToBase64(salt));
        localStorage.setItem('vault_validator', ciphertext);
        localStorage.setItem('vault_iv', iv);
        
        setCryptoKey(key);
        setIsFirstSetup(false);
        return true;
      } else {
        // --- UNLOCK EXISTING VAULT ---
        const saltStr = localStorage.getItem('vault_salt');
        const validatorStr = localStorage.getItem('vault_validator');
        const ivStr = localStorage.getItem('vault_iv');

        if (!saltStr || !validatorStr || !ivStr) {
          throw new Error("Vault metadata missing. Storage may have been corrupted.");
        }

        const salt = base64ToBuffer(saltStr);
        const key = await deriveKey(password, salt);

        // Attempt to decrypt the validator string to prove the key is correct
        const decrypted = await decryptData(validatorStr, ivStr, key);
        
        if (decrypted === "ZEN_VAULT_VALID") {
          setCryptoKey(key);
          return true;
        } else {
          return false;
        }
      }
    } catch (error) {
      console.error("Unlock failed:", error);
      return false; // Decryption failed, usually due to wrong password
    }
  };

  const setupBiometrics = async (): Promise<boolean> => {
    try {
      if (!cryptoKey) throw new Error("Vault must be unlocked first");
      const { credentialId } = await registerBiometricVault();
      
      // We need to verify that we can actually unlock it and save the PRF seed as a secondary key validator
      const prfSeed = await unlockWithBiometrics(credentialId);
      const biometricKey = await importRawKey(prfSeed);
      
      // Encrypt our known string with this new biometric key
      const { ciphertext, iv } = await encryptData("ZEN_VAULT_VALID", biometricKey);
      
      localStorage.setItem('vault_biometric_id', credentialId);
      localStorage.setItem('vault_biometric_validator', ciphertext);
      localStorage.setItem('vault_biometric_iv', iv);
      
      setHasBiometrics(true);
      return true;
    } catch (e) {
      console.error("Biometric setup failed:", e);
      return false;
    }
  };

  const unlockVaultBiometric = async (): Promise<boolean> => {
    try {
      const credentialId = localStorage.getItem('vault_biometric_id');
      const validatorStr = localStorage.getItem('vault_biometric_validator');
      const ivStr = localStorage.getItem('vault_biometric_iv');

      if (!credentialId || !validatorStr || !ivStr) return false;

      const prfSeed = await unlockWithBiometrics(credentialId);
      const biometricKey = await importRawKey(prfSeed);

      const decrypted = await decryptData(validatorStr, ivStr, biometricKey);
      
      if (decrypted === "ZEN_VAULT_VALID") {
        setCryptoKey(biometricKey);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Biometric unlock failed:", e);
      return false;
    }
  };

  const lockVault = () => {
    setCryptoKey(null);
  };

  return (
    <AuthContext.Provider value={{ cryptoKey, isLocked: !cryptoKey, isFirstSetup, hasBiometrics, unlockVault, setupBiometrics, unlockVaultBiometric, lockVault, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
