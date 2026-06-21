"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { deriveKey, generateSalt, bufferToBase64, base64ToBuffer, encryptData, decryptData } from '@/utils/crypto';

interface AuthContextType {
  cryptoKey: CryptoKey | null;
  isLocked: boolean;
  isFirstSetup: boolean;
  unlockVault: (password: string) => Promise<boolean>;
  lockVault: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isFirstSetup, setIsFirstSetup] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if a vault already exists on mount
  useEffect(() => {
    const salt = localStorage.getItem('vault_salt');
    const validator = localStorage.getItem('vault_validator');
    const iv = localStorage.getItem('vault_iv');

    if (salt && validator && iv) {
      setIsFirstSetup(false);
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

  const lockVault = () => {
    setCryptoKey(null);
  };

  return (
    <AuthContext.Provider value={{ cryptoKey, isLocked: !cryptoKey, isFirstSetup, unlockVault, lockVault, isLoading }}>
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
