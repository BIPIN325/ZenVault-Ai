import { getAllDocuments, getAllChunks, clearAllData, saveDocumentsBatch, saveChunksBatch, DocumentMetadata, EncryptedChunk } from './db';

interface ZenVaultBackup {
  version: number;
  localStorage: {
    vault_salt: string | null;
    vault_validator: string | null;
    vault_iv: string | null;
  };
  localforage: {
    documents: DocumentMetadata[];
    chunks: EncryptedChunk[];
  };
}

export async function exportVault(): Promise<void> {
  const documents = await getAllDocuments();
  const chunks = await getAllChunks();

  const backup: ZenVaultBackup = {
    version: 1,
    localStorage: {
      vault_salt: localStorage.getItem('vault_salt'),
      vault_validator: localStorage.getItem('vault_validator'),
      vault_iv: localStorage.getItem('vault_iv')
    },
    localforage: {
      documents,
      chunks
    }
  };

  const jsonString = JSON.stringify(backup);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `zen_backup_${dateStr}.vault`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importVault(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backup: ZenVaultBackup = JSON.parse(text);

        // Basic Schema Validation
        if (!backup.version || !backup.localStorage || !backup.localforage) {
          throw new Error('Invalid ZenVault backup file format.');
        }

        // 1. Clear existing localforage DB
        await clearAllData();

        // 2. Restore localforage DB
        await saveDocumentsBatch(backup.localforage.documents || []);
        await saveChunksBatch(backup.localforage.chunks || []);

        // 3. Restore localStorage salts
        if (backup.localStorage.vault_salt) {
          localStorage.setItem('vault_salt', backup.localStorage.vault_salt);
        } else {
          localStorage.removeItem('vault_salt');
        }

        if (backup.localStorage.vault_validator) {
          localStorage.setItem('vault_validator', backup.localStorage.vault_validator);
        } else {
          localStorage.removeItem('vault_validator');
        }

        if (backup.localStorage.vault_iv) {
          localStorage.setItem('vault_iv', backup.localStorage.vault_iv);
        } else {
          localStorage.removeItem('vault_iv');
        }

        // Force reload the app so AuthContext and other states refresh with the new data
        window.location.reload();
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the backup file.'));
    };

    reader.readAsText(file);
  });
}
