"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getVault, VaultDB } from '@/utils/db';

export const AVAILABLE_VAULTS = ["Default Vault", "Financial", "Coding", "Personal"];

interface VaultContextType {
  activeVault: string;
  vaultDb: VaultDB;
  switchVault: (vaultName: string) => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [activeVault, setActiveVault] = useState<string>("Default Vault");

  const switchVault = (vaultName: string) => {
    setActiveVault(vaultName);
  };

  const vaultDb = getVault(activeVault);

  return (
    <VaultContext.Provider value={{ activeVault, switchVault, vaultDb }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
