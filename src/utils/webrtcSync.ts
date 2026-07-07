import { VaultDB } from './db';
import { exportVaultToString, importVaultFromString } from './backup';

const CHUNK_SIZE = 16384; // 16KB max payload for reliable WebRTC transfer

export class PeerSyncManager {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private vaultDb: VaultDB;
  
  // Callbacks
  public onStatusChange?: (status: string) => void;
  public onSyncProgress?: (progress: number) => void;
  public onSyncComplete?: () => void;
  public onError?: (error: string) => void;

  // Buffer for receiving chunks
  private receiveBuffer: string[] = [];
  private expectedChunks: number = 0;
  private receivedChunks: number = 0;

  constructor(vaultDb: VaultDB) {
    this.vaultDb = vaultDb;
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Only used to discover local/public IP, no data passes through
      ]
    });

    this.pc.oniceconnectionstatechange = () => {
      this.updateStatus(`ICE Connection: ${this.pc.iceConnectionState}`);
      if (this.pc.iceConnectionState === 'disconnected' || this.pc.iceConnectionState === 'failed') {
        this.emitError('Peer connection lost or failed.');
      }
    };
  }

  private updateStatus(msg: string) {
    if (this.onStatusChange) this.onStatusChange(msg);
    console.log(`[WebRTC Sync] ${msg}`);
  }

  private emitError(msg: string) {
    if (this.onError) this.onError(msg);
    console.error(`[WebRTC Sync Error] ${msg}`);
  }

  // ==========================================
  // HOST (INITIATOR) LOGIC
  // ==========================================
  
  public async createOffer(): Promise<string> {
    this.updateStatus('Creating Data Channel...');
    this.dataChannel = this.pc.createDataChannel('zenvault-sync', {
      ordered: true
    });
    this.setupDataChannel();

    return new Promise((resolve, reject) => {
      this.pc.onicecandidate = (event) => {
        // Wait until all ICE candidates are gathered
        if (event.candidate === null) {
          const offerStr = JSON.stringify(this.pc.localDescription);
          resolve(btoa(offerStr));
        }
      };

      this.pc.createOffer()
        .then(offer => this.pc.setLocalDescription(offer))
        .catch(err => {
          this.emitError('Failed to create offer.');
          reject(err);
        });
    });
  }

  public async finalizeConnection(base64Answer: string): Promise<void> {
    try {
      this.updateStatus('Finalizing connection with client answer...');
      const answerStr = atob(base64Answer);
      const answer = JSON.parse(answerStr);
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      this.emitError('Invalid Connection Token.');
    }
  }

  // ==========================================
  // CLIENT (RECEIVER) LOGIC
  // ==========================================

  public async acceptOffer(base64Offer: string): Promise<string> {
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    return new Promise(async (resolve, reject) => {
      try {
        const offerStr = atob(base64Offer);
        const offer = JSON.parse(offerStr);
        await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

        this.pc.onicecandidate = (event) => {
          if (event.candidate === null) {
            const answerStr = JSON.stringify(this.pc.localDescription);
            resolve(btoa(answerStr));
          }
        };

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
      } catch (e) {
        this.emitError('Invalid Sync Token.');
        reject(e);
      }
    });
  }

  // ==========================================
  // DATA CHANNEL LOGIC (SHARED)
  // ==========================================

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      this.updateStatus('Tunnel Established');
      if (this.onStatusChange) this.onStatusChange('Connected');
    };

    this.dataChannel.onclose = () => {
      this.updateStatus('Tunnel Closed');
    };

    this.dataChannel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const message = event.data;
        
        // Check for chunk headers
        if (message.startsWith('SYNC_INIT|')) {
          this.expectedChunks = parseInt(message.split('|')[1], 10);
          this.receiveBuffer = new Array(this.expectedChunks);
          this.receivedChunks = 0;
          this.updateStatus('Receiving data...');
        } else if (message.startsWith('CHUNK|')) {
          const parts = message.split('|');
          const index = parseInt(parts[1], 10);
          const payload = parts.slice(2).join('|'); // The rest of the message is the payload

          this.receiveBuffer[index] = payload;
          this.receivedChunks++;

          if (this.onSyncProgress) {
            this.onSyncProgress(Math.round((this.receivedChunks / this.expectedChunks) * 100));
          }

          if (this.receivedChunks === this.expectedChunks) {
            await this.processReceivedData();
          }
        }
      }
    };
  }

  // Initiator sends the data
  public async sendVaultData() {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      this.emitError('Data channel is not open.');
      return;
    }

    try {
      this.updateStatus('Preparing vault data for sync...');
      const jsonString = await exportVaultToString(this.vaultDb);
      
      const numChunks = Math.ceil(jsonString.length / CHUNK_SIZE);
      
      // Notify receiver to prepare buffer
      this.dataChannel.send(`SYNC_INIT|${numChunks}`);

      // Send chunks sequentially
      let offset = 0;
      let chunkIndex = 0;

      const sendNextChunk = () => {
        if (offset < jsonString.length) {
          const chunk = jsonString.substring(offset, offset + CHUNK_SIZE);
          const message = `CHUNK|${chunkIndex}|${chunk}`;
          
          if (this.dataChannel) {
            this.dataChannel.send(message);
          }
          
          offset += CHUNK_SIZE;
          chunkIndex++;

          if (this.onSyncProgress) {
            this.onSyncProgress(Math.round((chunkIndex / numChunks) * 100));
          }

          // Use setTimeout to avoid blocking the event loop and overwhelming the RTC buffer
          setTimeout(sendNextChunk, 10);
        } else {
          this.updateStatus('Data sync transmission complete.');
          if (this.onSyncComplete) this.onSyncComplete();
        }
      };

      sendNextChunk();

    } catch (e) {
      this.emitError('Failed to send vault data.');
    }
  }

  // Receiver processes the data
  private async processReceivedData() {
    try {
      this.updateStatus('Reassembling and verifying data...');
      const jsonString = this.receiveBuffer.join('');
      
      this.updateStatus('Importing to local vault...');
      await importVaultFromString(this.vaultDb, jsonString);
      
      this.updateStatus('Sync Complete!');
      if (this.onSyncComplete) this.onSyncComplete();
    } catch (e) {
      this.emitError('Failed to import synced data.');
    }
  }

  public disconnect() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.pc) {
      this.pc.close();
    }
  }
}
