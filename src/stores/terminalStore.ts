/**
 * Terminal Store - Globaler Zustand mit Zustand
 */

import { create } from 'zustand';
import { database, TerminalConfig } from '../services/database';
import { syncService } from '../services/syncService';

// ============================================================================
// TYPES
// ============================================================================

interface TerminalState {
  // Terminal-Konfiguration
  isRegistered: boolean;
  config: TerminalConfig | null;
  
  // Verbindungsstatus
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  
  // UI-Status
  currentScreen: 'checkin' | 'settings' | 'admin';
  showPinPad: boolean;
  selectedUserId: number | null;
  
  // Fehler
  lastError: string | null;
  
  // Actions
  loadTerminalConfig: () => Promise<void>;
  registerTerminal: (config: TerminalConfig) => Promise<void>;
  updateConfig: (updates: Partial<TerminalConfig>) => Promise<void>;
  setSyncInterval: (seconds: number) => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  setSyncingStatus: (isSyncing: boolean) => void;
  updateSyncStats: () => Promise<void>;
  setCurrentScreen: (screen: 'checkin' | 'settings' | 'admin') => void;
  setShowPinPad: (show: boolean) => void;
  setSelectedUserId: (userId: number | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetTerminal: () => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const useTerminalStore = create<TerminalState>((set, get) => ({
  // Initial State
  isRegistered: false,
  config: null,
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  currentScreen: 'checkin',
  showPinPad: false,
  selectedUserId: null,
  lastError: null,

  // Actions
  loadTerminalConfig: async () => {
    try {
      const config = await database.getTerminalConfig();
      
      if (config) {
        set({
          isRegistered: true,
          config,
          lastSyncAt: config.lastSyncAt || null,
        });

        // Sync-Service initialisieren
        await syncService.initialize();
        syncService.startAutoSync();

        // Sync-Stats aktualisieren
        await get().updateSyncStats();
      } else {
        set({ isRegistered: false, config: null });
      }
    } catch (error) {
      console.error('Failed to load terminal config:', error);
      set({ lastError: 'Konfiguration konnte nicht geladen werden' });
    }
  },

  registerTerminal: async (config: TerminalConfig) => {
    try {
      await database.saveTerminalConfig(config);
      
      set({
        isRegistered: true,
        config,
        lastError: null,
      });

      // Sync-Service initialisieren und starten
      await syncService.initialize();
      syncService.startAutoSync();

      // Vollständige Synchronisation durchführen
      await syncService.syncFull();
      await get().updateSyncStats();
    } catch (error) {
      console.error('Failed to register terminal:', error);
      set({ lastError: 'Terminal-Registrierung fehlgeschlagen' });
      throw error;
    }
  },

  updateConfig: async (updates: Partial<TerminalConfig>) => {
    const { config } = get();
    
    if (!config) {
      throw new Error('No config to update');
    }

    const newConfig = { ...config, ...updates };
    await database.saveTerminalConfig(newConfig);
    
    set({ config: newConfig });
  },

  setSyncInterval: async (seconds: number) => {
    await syncService.setSyncInterval(seconds);
    
    const { config } = get();
    if (config) {
      set({
        config: { ...config, syncIntervalSeconds: seconds },
      });
    }
  },

  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
  },

  setSyncingStatus: (isSyncing: boolean) => {
    set({ isSyncing });
  },

  updateSyncStats: async () => {
    try {
      const stats = await syncService.getStats();
      
      set({
        isOnline: stats.isOnline,
        isSyncing: stats.isSyncing,
        lastSyncAt: stats.lastSyncAt,
        pendingCount: stats.pendingCount,
      });
    } catch (error) {
      console.error('Failed to update sync stats:', error);
    }
  },

  setCurrentScreen: (screen: 'checkin' | 'settings' | 'admin') => {
    set({ currentScreen: screen });
  },

  setShowPinPad: (show: boolean) => {
    set({ showPinPad: show });
  },

  setSelectedUserId: (userId: number | null) => {
    set({ selectedUserId: userId });
  },

  setError: (error: string | null) => {
    set({ lastError: error });
  },

  clearError: () => {
    set({ lastError: null });
  },

  resetTerminal: async () => {
    try {
      // Sync stoppen
      syncService.stopAutoSync();
      
      // Alle Daten löschen
      await database.clearAllData();
      
      // State zurücksetzen
      set({
        isRegistered: false,
        config: null,
        isOnline: true,
        isSyncing: false,
        lastSyncAt: null,
        pendingCount: 0,
        currentScreen: 'checkin',
        showPinPad: false,
        selectedUserId: null,
        lastError: null,
      });
    } catch (error) {
      console.error('Failed to reset terminal:', error);
      set({ lastError: 'Terminal-Reset fehlgeschlagen' });
      throw error;
    }
  },
}));

export default useTerminalStore;
