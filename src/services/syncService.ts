/**
 * Sync Service - Synchronisation mit Timer-Backend
 * 
 * Features:
 * - Konfigurierbares Sync-Intervall
 * - Offline-Queue mit automatischer Wiederholung
 * - Konflikt-Erkennung und -Auflösung
 * - Heartbeat für Verbindungsstatus
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { database, TerminalConfig, LocalUser } from './database';
import { CheckinRecord } from './checkinService';
import { createApiSignature } from './cryptoService';
import { useTerminalStore } from '../stores/terminalStore';

// ============================================================================
// TYPES
// ============================================================================

interface SyncRequest {
  terminalId: string;
  lastSyncTimestamp: number;
  checkins: CheckinRecord[];
  syncType: 'full' | 'incremental' | 'heartbeat';
}

interface SyncResponse {
  success: boolean;
  serverTimestamp: number;
  syncedRecords: number;
  failedRecords: { localId: string; error: string }[];
  users?: ServerUser[];
  settings?: ServerSettings;
  conflicts?: ConflictRecord[];
}

interface ServerUser {
  userId: number;
  name: string;
  personnelNumber?: string;
  department?: string;
  nfcCardHash: string | null;
  pinHash: string | null;
  profilePhotoUrl?: string;
  isActive: boolean;
}

interface ServerSettings {
  syncIntervalSeconds: number;
  offlineBufferHours: number;
  nfcEnabled: boolean;
  pinFallbackEnabled: boolean;
  timezone: string;
  language: string;
  breakReminderMinutes: number;
  autoCheckoutHours: number;
}

interface ConflictRecord {
  localId: string;
  serverRecord: any;
  conflictType: 'duplicate' | 'time_mismatch' | 'user_mismatch';
  resolution: 'use_server' | 'use_local' | 'manual';
}

// ============================================================================
// SYNC SERVICE
// ============================================================================

class SyncService {
  private api: AxiosInstance | null = null;
  private config: TerminalConfig | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private isOnline = true;
  private retryCount = 0;
  private maxRetries = 3;

  /**
   * Initialisiert den Sync-Service
   */
  async initialize(): Promise<boolean> {
    try {
      this.config = await database.getTerminalConfig();
      
      if (!this.config) {
        console.log('No terminal config found, sync disabled');
        return false;
      }

      // API-Client erstellen
      this.api = axios.create({
        baseURL: this.config.serverUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Request-Interceptor für Authentifizierung
      this.api.interceptors.request.use(async (config) => {
        if (this.config) {
          const timestamp = Date.now();
          const signature = await createApiSignature(
            this.config.terminalId,
            timestamp,
            this.config.apiKey
          );

          const authPayload = {
            terminalId: this.config.terminalId,
            apiKey: this.config.apiKey,
            timestamp,
            signature,
          };

          config.headers['X-Terminal-Auth'] = Buffer.from(
            JSON.stringify(authPayload)
          ).toString('base64');
        }
        return config;
      });

      // Response-Interceptor für Fehlerbehandlung
      this.api.interceptors.response.use(
        (response) => {
          this.isOnline = true;
          this.retryCount = 0;
          return response;
        },
        (error: AxiosError) => {
          if (!error.response) {
            this.isOnline = false;
          }
          return Promise.reject(error);
        }
      );

      console.log('Sync service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
      return false;
    }
  }

  /**
   * Startet die automatische Synchronisation
   */
  startAutoSync(): void {
    if (!this.config) {
      console.warn('Cannot start auto sync: no config');
      return;
    }

    // Bestehende Intervalle stoppen
    this.stopAutoSync();

    // Sync-Intervall starten
    const syncMs = this.config.syncIntervalSeconds * 1000;
    this.syncInterval = setInterval(() => {
      this.syncIncremental();
    }, syncMs);

    // Heartbeat alle 30 Sekunden
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    // Sofort erste Synchronisation durchführen
    this.syncIncremental();

    console.log(`Auto sync started with ${this.config.syncIntervalSeconds}s interval`);
  }

  /**
   * Stoppt die automatische Synchronisation
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log('Auto sync stopped');
  }

  /**
   * Ändert das Sync-Intervall
   */
  async setSyncInterval(seconds: number): Promise<void> {
    if (this.config) {
      this.config.syncIntervalSeconds = seconds;
      await database.saveTerminalConfig(this.config);
      
      // Intervall neu starten
      if (this.syncInterval) {
        this.startAutoSync();
      }
    }
  }

  /**
   * Führt eine vollständige Synchronisation durch
   */
  async syncFull(): Promise<SyncResponse | null> {
    return this.performSync('full');
  }

  /**
   * Führt eine inkrementelle Synchronisation durch
   */
  async syncIncremental(): Promise<SyncResponse | null> {
    return this.performSync('incremental');
  }

  /**
   * Hauptsynchronisations-Logik
   */
  private async performSync(
    syncType: 'full' | 'incremental'
  ): Promise<SyncResponse | null> {
    if (!this.api || !this.config) {
      console.warn('Sync skipped: not initialized');
      return null;
    }

    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return null;
    }

    this.isSyncing = true;
    const logId = await database.logSyncStart(syncType);

    try {
      // Pending Check-ins holen
      const pendingCheckins = await database.getPendingCheckins();

      // Sync-Request erstellen
      const request: SyncRequest = {
        terminalId: this.config.terminalId,
        lastSyncTimestamp: this.config.lastSyncAt || 0,
        checkins: pendingCheckins,
        syncType,
      };

      // API-Aufruf
      const response = await this.api.post<SyncResponse>('/api/terminal/sync', request);
      const data = response.data;

      if (data.success) {
        // Erfolgreiche Einträge markieren
        const syncedLocalIds = pendingCheckins
          .filter((c) => !data.failedRecords.find((f) => f.localId === c.localId))
          .map((c) => c.localId);

        for (const localId of syncedLocalIds) {
          await database.updateCheckinSyncStatus(localId, 'synced', Date.now());
        }

        // Fehlgeschlagene Einträge markieren
        for (const failed of data.failedRecords) {
          await database.updateCheckinSyncStatus(failed.localId, 'failed', undefined, failed.error);
        }

        // Benutzer aktualisieren (bei full sync)
        if (data.users && data.users.length > 0) {
          await this.updateLocalUsers(data.users);
        }

        // Einstellungen aktualisieren
        if (data.settings) {
          await this.updateSettings(data.settings);
        }

        // Konflikte behandeln
        if (data.conflicts && data.conflicts.length > 0) {
          await this.handleConflicts(data.conflicts);
        }

        // Last sync timestamp aktualisieren
        this.config.lastSyncAt = data.serverTimestamp;
        await database.saveTerminalConfig(this.config);

        // Sync-Log abschließen
        await database.logSyncComplete(
          logId,
          syncedLocalIds.length,
          data.users?.length || 0,
          data.failedRecords.length
        );

        console.log(`Sync completed: ${syncedLocalIds.length} sent, ${data.users?.length || 0} received`);
        return data;
      } else {
        throw new Error('Sync failed: server returned success=false');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await database.logSyncFailed(logId, errorMessage);
      
      console.error('Sync failed:', errorMessage);

      // Retry-Logik
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retry ${this.retryCount}/${this.maxRetries} in 10 seconds...`);
        setTimeout(() => this.syncIncremental(), 10000);
      }

      return null;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sendet einen Heartbeat an den Server
   */
  async sendHeartbeat(): Promise<boolean> {
    if (!this.api || !this.config) return false;

    try {
      const stats = await database.getStats();

      await this.api.post('/api/terminal/heartbeat', {
        pendingRecords: stats.pendingCheckins,
        totalUsers: stats.totalUsers,
        todayCheckins: stats.todayCheckins,
      });

      this.isOnline = true;
      return true;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Aktualisiert lokale Benutzer mit Server-Daten
   */
  private async updateLocalUsers(serverUsers: ServerUser[]): Promise<void> {
    const localUsers: LocalUser[] = serverUsers.map((u) => ({
      id: u.userId,
      name: u.name,
      personnelNumber: u.personnelNumber,
      department: u.department,
      nfcCardHash: u.nfcCardHash || undefined,
      pinHash: u.pinHash || undefined,
      profilePhotoUrl: u.profilePhotoUrl,
      isActive: u.isActive,
      lastSyncedAt: Date.now(),
    }));

    await database.saveUsers(localUsers);
    console.log(`Updated ${localUsers.length} local users`);
  }

  /**
   * Aktualisiert Einstellungen mit Server-Daten
   */
  private async updateSettings(settings: ServerSettings): Promise<void> {
    if (!this.config) return;

    this.config.syncIntervalSeconds = settings.syncIntervalSeconds;
    this.config.offlineBufferHours = settings.offlineBufferHours;
    this.config.nfcEnabled = settings.nfcEnabled;
    this.config.pinFallbackEnabled = settings.pinFallbackEnabled;
    this.config.timezone = settings.timezone;
    this.config.language = settings.language;

    await database.saveTerminalConfig(this.config);

    // Intervall neu starten wenn geändert
    if (this.syncInterval) {
      this.startAutoSync();
    }
  }

  /**
   * Behandelt Synchronisations-Konflikte
   */
  private async handleConflicts(conflicts: ConflictRecord[]): Promise<void> {
    for (const conflict of conflicts) {
      console.warn(`Conflict detected for ${conflict.localId}: ${conflict.conflictType}`);

      switch (conflict.resolution) {
        case 'use_server':
          // Server-Version übernehmen (lokalen Eintrag als Konflikt markieren)
          await database.updateCheckinSyncStatus(
            conflict.localId,
            'conflict',
            undefined,
            `Resolved: ${conflict.conflictType}`
          );
          break;

        case 'use_local':
          // Lokale Version behalten, erneut synchronisieren
          await database.updateCheckinSyncStatus(conflict.localId, 'pending');
          break;

        case 'manual':
          // Manuelle Auflösung erforderlich
          await database.updateCheckinSyncStatus(
            conflict.localId,
            'conflict',
            undefined,
            `Manual resolution required: ${conflict.conflictType}`
          );
          break;
      }
    }
  }

  /**
   * Prüft ob online
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Gibt Sync-Statistiken zurück
   */
  async getStats(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAt: number | null;
    pendingCount: number;
    syncInterval: number;
  }> {
    const dbStats = await database.getStats();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncAt: this.config?.lastSyncAt || null,
      pendingCount: dbStats.pendingCheckins,
      syncInterval: this.config?.syncIntervalSeconds || 60,
    };
  }

  /**
   * Erzwingt sofortige Synchronisation
   */
  async forceSync(): Promise<SyncResponse | null> {
    this.retryCount = 0;
    return this.syncFull();
  }

  /**
   * Bereinigt alte synchronisierte Daten
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    return database.deleteOldSyncedCheckins(olderThanDays);
  }
}

// Singleton-Instanz exportieren
export const syncService = new SyncService();
export default syncService;
