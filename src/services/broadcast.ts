import type { SyncMessage } from '../types';

const CHANNEL_NAME = 'carmel_exam_sync_channel';

class ExamBroadcastService {
  private channel: BroadcastChannel | null = null;
  private listeners: ((message: SyncMessage) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data && event.data.type) {
            this.notifyListeners(event.data as SyncMessage);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or blocked in this environment', err);
      }
    }
  }

  public subscribe(listener: (message: SyncMessage) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public broadcast(message: SyncMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.error('Error broadcasting message:', err);
      }
    }
    // Also notify local listeners in the current window
    this.notifyListeners(message);
  }

  private notifyListeners(message: SyncMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in broadcast listener:', err);
      }
    });
  }
}

export const examBroadcast = new ExamBroadcastService();
