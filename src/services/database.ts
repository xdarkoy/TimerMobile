/**
 * Database Service - SQLite-basierte lokale Datenspeicherung
 * 
 * Verwendet expo-sqlite für Offline-First Datenpersistenz
 */

import * as SQLite from 'expo-sqlite';
import type { CheckinRecord, UserStatus } from './checkinService';

// ============================================================================
// TYPES
// ============================================================================

export interface LocalUser {
  id: number;
  name: string;
  personnelNumber?: string;
  department?: string;
  nfcCardHash?: string;
  pinHash?: string;
  profilePhotoUrl?: string;
  isActive: boolean;
  lastSyncedAt?: number;
}

export interface TerminalConfig {
  terminalId: string;
  tenantId: number;
  name: string;
  location?: string;
  apiKey: string;
  serverUrl: string;
  syncIntervalSeconds: number;
  offlineBufferHours: number;
  nfcEnabled: boolean;
  pinFallbackEnabled: boolean;
  timezone: string;
  language: string;
  lastSyncAt?: number;
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

class Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialisiert die Datenbank und erstellt Tabellen
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('timer_mobile.db');
      
      // Tabellen erstellen
      await this.createTables();
      
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Erstellt alle benötigten Tabellen
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Terminal-Konfiguration
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS terminal_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        terminal_id TEXT NOT NULL,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        api_key TEXT NOT NULL,
        server_url TEXT NOT NULL,
        sync_interval_seconds INTEGER DEFAULT 60,
        offline_buffer_hours INTEGER DEFAULT 72,
        nfc_enabled INTEGER DEFAULT 1,
        pin_fallback_enabled INTEGER DEFAULT 1,
        timezone TEXT DEFAULT 'Europe/Berlin',
        language TEXT DEFAULT 'de',
        last_sync_at INTEGER
      );
    `);

    // Benutzer (lokaler Cache)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        personnel_number TEXT,
        department TEXT,
        nfc_card_hash TEXT,
        pin_hash TEXT,
        profile_photo_url TEXT,
        is_active INTEGER DEFAULT 1,
        last_synced_at INTEGER
      );
    `);

    // Benutzer-Status (aktueller Check-in-Status)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_status (
        user_id INTEGER PRIMARY KEY,
        is_checked_in INTEGER DEFAULT 0,
        is_on_break INTEGER DEFAULT 0,
        last_check_in INTEGER,
        last_check_out INTEGER,
        current_session_start INTEGER,
        total_today_minutes INTEGER DEFAULT 0,
        today_date TEXT
      );
    `);

    // Check-in/Check-out Einträge
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        check_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        auth_method TEXT NOT NULL,
        nfc_card_hash TEXT,
        latitude REAL,
        longitude REAL,
        created_offline INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        synced_at INTEGER,
        sync_error TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    `);

    // Sync-Log
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_type TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        records_sent INTEGER DEFAULT 0,
        records_received INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        status TEXT DEFAULT 'in_progress',
        error_message TEXT
      );
    `);

    // Indizes für Performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_checkins_sync_status ON checkins(sync_status);
      CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp);
      CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_nfc_hash ON users(nfc_card_hash);
      CREATE INDEX IF NOT EXISTS idx_users_pin_hash ON users(pin_hash);
    `);
  }

  // =========================================================================
  // TERMINAL CONFIG
  // =========================================================================

  async saveTerminalConfig(config: TerminalConfig): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO terminal_config 
       (id, terminal_id, tenant_id, name, location, api_key, server_url,
        sync_interval_seconds, offline_buffer_hours, nfc_enabled,
        pin_fallback_enabled, timezone, language, last_sync_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        config.terminalId,
        config.tenantId,
        config.name,
        config.location || null,
        config.apiKey,
        config.serverUrl,
        config.syncIntervalSeconds,
        config.offlineBufferHours,
        config.nfcEnabled ? 1 : 0,
        config.pinFallbackEnabled ? 1 : 0,
        config.timezone,
        config.language,
        config.lastSyncAt || null,
      ]
    );
  }

  async getTerminalConfig(): Promise<TerminalConfig | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM terminal_config WHERE id = 1'
    );

    if (!result) return null;

    return {
      terminalId: result.terminal_id,
      tenantId: result.tenant_id,
      name: result.name,
      location: result.location,
      apiKey: result.api_key,
      serverUrl: result.server_url,
      syncIntervalSeconds: result.sync_interval_seconds,
      offlineBufferHours: result.offline_buffer_hours,
      nfcEnabled: result.nfc_enabled === 1,
      pinFallbackEnabled: result.pin_fallback_enabled === 1,
      timezone: result.timezone,
      language: result.language,
      lastSyncAt: result.last_sync_at,
    };
  }

  // =========================================================================
  // USERS
  // =========================================================================

  async saveUser(user: LocalUser): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO users 
       (id, name, personnel_number, department, nfc_card_hash, pin_hash,
        profile_photo_url, is_active, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.personnelNumber || null,
        user.department || null,
        user.nfcCardHash || null,
        user.pinHash || null,
        user.profilePhotoUrl || null,
        user.isActive ? 1 : 0,
        user.lastSyncedAt || Date.now(),
      ]
    );
  }

  async saveUsers(users: LocalUser[]): Promise<void> {
    for (const user of users) {
      await this.saveUser(user);
    }
  }

  async getUserByNfcHash(nfcCardHash: string): Promise<LocalUser | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM users WHERE nfc_card_hash = ? AND is_active = 1',
      [nfcCardHash]
    );

    if (!result) return null;

    return this.mapUserRow(result);
  }

  async getUserByPinHash(pinHash: string): Promise<LocalUser | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM users WHERE pin_hash = ? AND is_active = 1',
      [pinHash]
    );

    if (!result) return null;

    return this.mapUserRow(result);
  }

  async getUserById(userId: number): Promise<LocalUser | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!result) return null;

    return this.mapUserRow(result);
  }

  async getAllUsers(): Promise<LocalUser[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM users WHERE is_active = 1 ORDER BY name'
    );

    return results.map(this.mapUserRow);
  }

  private mapUserRow(row: any): LocalUser {
    return {
      id: row.id,
      name: row.name,
      personnelNumber: row.personnel_number,
      department: row.department,
      nfcCardHash: row.nfc_card_hash,
      pinHash: row.pin_hash,
      profilePhotoUrl: row.profile_photo_url,
      isActive: row.is_active === 1,
      lastSyncedAt: row.last_synced_at,
    };
  }

  // =========================================================================
  // USER STATUS
  // =========================================================================

  async getUserStatus(userId: number): Promise<UserStatus | null> {
    if (!this.db) throw new Error('Database not initialized');

    const today = new Date().toISOString().split('T')[0];

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM user_status WHERE user_id = ?',
      [userId]
    );

    if (!result) return null;

    // Wenn der Tag gewechselt hat, Status zurücksetzen
    if (result.today_date !== today) {
      await this.resetDailyStatus(userId, today);
      return {
        userId,
        userName: '',
        isCheckedIn: false,
        isOnBreak: false,
        totalTodayMinutes: 0,
      };
    }

    const user = await this.getUserById(userId);

    return {
      userId: result.user_id,
      userName: user?.name || '',
      isCheckedIn: result.is_checked_in === 1,
      isOnBreak: result.is_on_break === 1,
      lastCheckIn: result.last_check_in,
      lastCheckOut: result.last_check_out,
      currentSessionStart: result.current_session_start,
      totalTodayMinutes: result.total_today_minutes || 0,
    };
  }

  async updateUserStatus(
    userId: number,
    updates: Partial<UserStatus>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const today = new Date().toISOString().split('T')[0];

    // Prüfen ob Eintrag existiert
    const existing = await this.db.getFirstAsync<any>(
      'SELECT user_id FROM user_status WHERE user_id = ?',
      [userId]
    );

    if (!existing) {
      // Neuen Eintrag erstellen
      await this.db.runAsync(
        `INSERT INTO user_status 
         (user_id, is_checked_in, is_on_break, last_check_in, last_check_out,
          current_session_start, total_today_minutes, today_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          updates.isCheckedIn ? 1 : 0,
          updates.isOnBreak ? 1 : 0,
          updates.lastCheckIn || null,
          updates.lastCheckOut || null,
          updates.currentSessionStart || null,
          updates.totalTodayMinutes || 0,
          today,
        ]
      );
    } else {
      // Bestehenden Eintrag aktualisieren
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.isCheckedIn !== undefined) {
        setClauses.push('is_checked_in = ?');
        values.push(updates.isCheckedIn ? 1 : 0);
      }
      if (updates.isOnBreak !== undefined) {
        setClauses.push('is_on_break = ?');
        values.push(updates.isOnBreak ? 1 : 0);
      }
      if (updates.lastCheckIn !== undefined) {
        setClauses.push('last_check_in = ?');
        values.push(updates.lastCheckIn);
      }
      if (updates.lastCheckOut !== undefined) {
        setClauses.push('last_check_out = ?');
        values.push(updates.lastCheckOut);
      }
      if (updates.currentSessionStart !== undefined) {
        setClauses.push('current_session_start = ?');
        values.push(updates.currentSessionStart || null);
      }
      if (updates.totalTodayMinutes !== undefined) {
        setClauses.push('total_today_minutes = ?');
        values.push(updates.totalTodayMinutes);
      }

      setClauses.push('today_date = ?');
      values.push(today);
      values.push(userId);

      await this.db.runAsync(
        `UPDATE user_status SET ${setClauses.join(', ')} WHERE user_id = ?`,
        values
      );
    }
  }

  private async resetDailyStatus(userId: number, today: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE user_status SET 
       is_checked_in = 0, is_on_break = 0, current_session_start = NULL,
       total_today_minutes = 0, today_date = ?
       WHERE user_id = ?`,
      [today, userId]
    );
  }

  // =========================================================================
  // CHECKINS
  // =========================================================================

  async saveCheckin(checkin: CheckinRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO checkins 
       (local_id, user_id, user_name, check_type, timestamp, auth_method,
        nfc_card_hash, latitude, longitude, created_offline, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        checkin.localId,
        checkin.userId,
        checkin.userName,
        checkin.checkType,
        checkin.timestamp,
        checkin.authMethod,
        checkin.nfcCardHash || null,
        checkin.latitude || null,
        checkin.longitude || null,
        checkin.createdOffline ? 1 : 0,
        checkin.syncStatus,
      ]
    );
  }

  async getCheckinsSince(timestamp: number): Promise<CheckinRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM checkins WHERE timestamp >= ? ORDER BY timestamp DESC',
      [timestamp]
    );

    return results.map(this.mapCheckinRow);
  }

  async getPendingCheckins(): Promise<CheckinRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM checkins 
       WHERE sync_status IN ('pending', 'failed') 
       ORDER BY timestamp ASC`
    );

    return results.map(this.mapCheckinRow);
  }

  async updateCheckinSyncStatus(
    localId: string,
    status: 'pending' | 'synced' | 'failed' | 'conflict',
    syncedAt?: number,
    syncError?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE checkins SET sync_status = ?, synced_at = ?, sync_error = ?
       WHERE local_id = ?`,
      [status, syncedAt || null, syncError || null, localId]
    );
  }

  async deleteOldSyncedCheckins(olderThanDays: number = 30): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const result = await this.db.runAsync(
      `DELETE FROM checkins WHERE sync_status = 'synced' AND timestamp < ?`,
      [cutoff]
    );

    return result.changes;
  }

  private mapCheckinRow(row: any): CheckinRecord {
    return {
      id: row.id,
      localId: row.local_id,
      userId: row.user_id,
      userName: row.user_name,
      checkType: row.check_type,
      timestamp: row.timestamp,
      authMethod: row.auth_method,
      nfcCardHash: row.nfc_card_hash,
      latitude: row.latitude,
      longitude: row.longitude,
      createdOffline: row.created_offline === 1,
      syncStatus: row.sync_status,
      syncedAt: row.synced_at,
      syncError: row.sync_error,
    };
  }

  // =========================================================================
  // SYNC LOG
  // =========================================================================

  async logSyncStart(syncType: 'full' | 'incremental' | 'heartbeat'): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      `INSERT INTO sync_log (sync_type, started_at, status) VALUES (?, ?, 'in_progress')`,
      [syncType, Date.now()]
    );

    return result.lastInsertRowId;
  }

  async logSyncComplete(
    logId: number,
    recordsSent: number,
    recordsReceived: number,
    recordsFailed: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE sync_log SET 
       completed_at = ?, records_sent = ?, records_received = ?,
       records_failed = ?, status = 'completed'
       WHERE id = ?`,
      [Date.now(), recordsSent, recordsReceived, recordsFailed, logId]
    );
  }

  async logSyncFailed(logId: number, errorMessage: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE sync_log SET completed_at = ?, status = 'failed', error_message = ?
       WHERE id = ?`,
      [Date.now(), errorMessage, logId]
    );
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  async getStats(): Promise<{
    totalUsers: number;
    pendingCheckins: number;
    todayCheckins: number;
    lastSyncAt: number | null;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [users, pending, today, config] = await Promise.all([
      this.db.getFirstAsync<any>('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),
      this.db.getFirstAsync<any>(`SELECT COUNT(*) as count FROM checkins WHERE sync_status = 'pending'`),
      this.db.getFirstAsync<any>('SELECT COUNT(*) as count FROM checkins WHERE timestamp >= ?', [startOfDay.getTime()]),
      this.getTerminalConfig(),
    ]);

    return {
      totalUsers: users?.count || 0,
      pendingCheckins: pending?.count || 0,
      todayCheckins: today?.count || 0,
      lastSyncAt: config?.lastSyncAt || null,
    };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DELETE FROM checkins;
      DELETE FROM user_status;
      DELETE FROM users;
      DELETE FROM sync_log;
      DELETE FROM terminal_config;
    `);
  }
}

// Singleton-Instanz exportieren
export const database = new Database();

// Initialisierungsfunktion für App-Start
export async function initializeDatabase(): Promise<void> {
  await database.initialize();
}

export default database;
