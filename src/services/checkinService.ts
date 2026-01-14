/**
 * Check-in Service - Verwaltet Check-in/Check-out Logik
 */

import { database } from './database';
import { generateLocalId } from './cryptoService';
import { useTerminalStore } from '../stores/terminalStore';

// ============================================================================
// TYPES
// ============================================================================

export type CheckType = 'check_in' | 'check_out' | 'break_start' | 'break_end';
export type AuthMethod = 'nfc' | 'pin' | 'manual';

export interface CheckinRecord {
  id?: number;
  localId: string;
  userId: number;
  userName: string;
  checkType: CheckType;
  timestamp: number;
  authMethod: AuthMethod;
  nfcCardHash?: string;
  latitude?: number;
  longitude?: number;
  createdOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict';
  syncedAt?: number;
  syncError?: string;
}

export interface UserStatus {
  userId: number;
  userName: string;
  isCheckedIn: boolean;
  isOnBreak: boolean;
  lastCheckIn?: number;
  lastCheckOut?: number;
  currentSessionStart?: number;
  totalTodayMinutes: number;
}

// ============================================================================
// CHECK-IN SERVICE
// ============================================================================

class CheckinService {
  /**
   * Führt einen Check-in durch
   */
  async checkIn(
    userId: number,
    userName: string,
    authMethod: AuthMethod,
    nfcCardHash?: string
  ): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      localId: generateLocalId(),
      userId,
      userName,
      checkType: 'check_in',
      timestamp: Date.now(),
      authMethod,
      nfcCardHash,
      createdOffline: !navigator.onLine,
      syncStatus: 'pending',
    };

    // In lokale Datenbank speichern
    await database.saveCheckin(record);

    // Benutzer-Status aktualisieren
    await database.updateUserStatus(userId, {
      isCheckedIn: true,
      lastCheckIn: record.timestamp,
      currentSessionStart: record.timestamp,
    });

    return record;
  }

  /**
   * Führt einen Check-out durch
   */
  async checkOut(
    userId: number,
    userName: string,
    authMethod: AuthMethod,
    nfcCardHash?: string
  ): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      localId: generateLocalId(),
      userId,
      userName,
      checkType: 'check_out',
      timestamp: Date.now(),
      authMethod,
      nfcCardHash,
      createdOffline: !navigator.onLine,
      syncStatus: 'pending',
    };

    // In lokale Datenbank speichern
    await database.saveCheckin(record);

    // Arbeitszeit berechnen
    const userStatus = await database.getUserStatus(userId);
    let sessionMinutes = 0;
    
    if (userStatus?.currentSessionStart) {
      sessionMinutes = Math.round(
        (record.timestamp - userStatus.currentSessionStart) / 60000
      );
    }

    // Benutzer-Status aktualisieren
    await database.updateUserStatus(userId, {
      isCheckedIn: false,
      isOnBreak: false,
      lastCheckOut: record.timestamp,
      currentSessionStart: undefined,
      totalTodayMinutes: (userStatus?.totalTodayMinutes || 0) + sessionMinutes,
    });

    return record;
  }

  /**
   * Startet eine Pause
   */
  async startBreak(
    userId: number,
    userName: string,
    authMethod: AuthMethod
  ): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      localId: generateLocalId(),
      userId,
      userName,
      checkType: 'break_start',
      timestamp: Date.now(),
      authMethod,
      createdOffline: !navigator.onLine,
      syncStatus: 'pending',
    };

    await database.saveCheckin(record);
    await database.updateUserStatus(userId, { isOnBreak: true });

    return record;
  }

  /**
   * Beendet eine Pause
   */
  async endBreak(
    userId: number,
    userName: string,
    authMethod: AuthMethod
  ): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      localId: generateLocalId(),
      userId,
      userName,
      checkType: 'break_end',
      timestamp: Date.now(),
      authMethod,
      createdOffline: !navigator.onLine,
      syncStatus: 'pending',
    };

    await database.saveCheckin(record);
    await database.updateUserStatus(userId, { isOnBreak: false });

    return record;
  }

  /**
   * Intelligenter Check-in/Check-out Toggle
   * Bestimmt automatisch die richtige Aktion basierend auf dem aktuellen Status
   */
  async toggleCheckin(
    userId: number,
    userName: string,
    authMethod: AuthMethod,
    nfcCardHash?: string
  ): Promise<{ action: CheckType; record: CheckinRecord }> {
    const userStatus = await database.getUserStatus(userId);

    if (!userStatus?.isCheckedIn) {
      // Benutzer ist nicht eingecheckt -> Check-in
      const record = await this.checkIn(userId, userName, authMethod, nfcCardHash);
      return { action: 'check_in', record };
    } else {
      // Benutzer ist eingecheckt -> Check-out
      const record = await this.checkOut(userId, userName, authMethod, nfcCardHash);
      return { action: 'check_out', record };
    }
  }

  /**
   * Holt den aktuellen Status eines Benutzers
   */
  async getUserStatus(userId: number): Promise<UserStatus | null> {
    return database.getUserStatus(userId);
  }

  /**
   * Holt alle heute eingecheckten Benutzer
   */
  async getTodayCheckins(): Promise<CheckinRecord[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    return database.getCheckinsSince(startOfDay.getTime());
  }

  /**
   * Holt alle nicht synchronisierten Einträge
   */
  async getPendingCheckins(): Promise<CheckinRecord[]> {
    return database.getPendingCheckins();
  }

  /**
   * Markiert Einträge als synchronisiert
   */
  async markAsSynced(localIds: string[]): Promise<void> {
    for (const localId of localIds) {
      await database.updateCheckinSyncStatus(localId, 'synced', Date.now());
    }
  }

  /**
   * Markiert Einträge als fehlgeschlagen
   */
  async markAsFailed(localId: string, error: string): Promise<void> {
    await database.updateCheckinSyncStatus(localId, 'failed', undefined, error);
  }

  /**
   * Formatiert die Arbeitszeit für Anzeige
   */
  formatWorkTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Berechnet die aktuelle Session-Dauer
   */
  calculateSessionDuration(sessionStart: number): number {
    return Math.round((Date.now() - sessionStart) / 60000);
  }
}

// Singleton-Instanz exportieren
export const checkinService = new CheckinService();
export default checkinService;
