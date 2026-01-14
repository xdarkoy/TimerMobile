/**
 * Settings Screen - Terminal-Einstellungen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTerminalStore } from '../stores/terminalStore';
import { syncService } from '../services/syncService';
import { database } from '../services/database';
import type { RootStackParamList } from '../../App';

// ============================================================================
// TYPES
// ============================================================================

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

// ============================================================================
// COMPONENT
// ============================================================================

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    config,
    isOnline,
    pendingCount,
    lastSyncAt,
    updateConfig,
    setSyncInterval,
    resetTerminal,
    updateSyncStats,
  } = useTerminalStore();

  const [stats, setStats] = useState({
    totalUsers: 0,
    todayCheckins: 0,
  });

  // Stats laden
  useEffect(() => {
    async function loadStats() {
      const dbStats = await database.getStats();
      setStats({
        totalUsers: dbStats.totalUsers,
        todayCheckins: dbStats.todayCheckins,
      });
    }
    loadStats();
  }, []);

  // Sofortige Synchronisation
  const handleForceSync = async () => {
    await syncService.forceSync();
    await updateSyncStats();
    Alert.alert('Synchronisation', 'Synchronisation abgeschlossen');
  };

  // Terminal zurücksetzen
  const handleReset = () => {
    Alert.alert(
      'Terminal zurücksetzen',
      'Alle lokalen Daten werden gelöscht. Nicht synchronisierte Einträge gehen verloren. Fortfahren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen',
          style: 'destructive',
          onPress: async () => {
            await resetTerminal();
            navigation.replace('Setup');
          },
        },
      ]
    );
  };

  // Sync-Intervall ändern
  const handleSyncIntervalChange = (seconds: number) => {
    setSyncInterval(seconds);
  };

  // Zeit formatieren
  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Nie';
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Einstellungen</Text>
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate('Admin')}
        >
          <Ionicons name="shield-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Terminal-Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terminal</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{config?.name || '-'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Standort</Text>
            <Text style={styles.infoValue}>{config?.location || '-'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Terminal-ID</Text>
            <Text style={styles.infoValueSmall}>{config?.terminalId || '-'}</Text>
          </View>
        </View>

        {/* Verbindungsstatus */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verbindung</Text>
          
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[
                styles.statusDot,
                isOnline ? styles.statusOnline : styles.statusOffline,
              ]} />
              <Text style={styles.statusLabel}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color={pendingCount > 0 ? '#f59e0b' : '#4ade80'}
              />
              <Text style={styles.statusLabel}>
                {pendingCount} ausstehend
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Letzte Synchronisation</Text>
            <Text style={styles.infoValue}>{formatLastSync(lastSyncAt)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Server</Text>
            <Text style={styles.infoValueSmall}>{config?.serverUrl || '-'}</Text>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleForceSync}
          >
            <Ionicons name="sync-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Jetzt synchronisieren</Text>
          </TouchableOpacity>
        </View>

        {/* Sync-Einstellungen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synchronisation</Text>
          
          <Text style={styles.settingLabel}>Sync-Intervall</Text>
          <View style={styles.intervalButtons}>
            {[30, 60, 120, 300].map((seconds) => (
              <TouchableOpacity
                key={seconds}
                style={[
                  styles.intervalButton,
                  config?.syncIntervalSeconds === seconds && styles.intervalButtonActive,
                ]}
                onPress={() => handleSyncIntervalChange(seconds)}
              >
                <Text style={[
                  styles.intervalButtonText,
                  config?.syncIntervalSeconds === seconds && styles.intervalButtonTextActive,
                ]}>
                  {seconds < 60 ? `${seconds}s` : `${seconds / 60}min`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Authentifizierung */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentifizierung</Text>
          
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>NFC aktiviert</Text>
              <Text style={styles.switchDescription}>
                Mitarbeiter können mit NFC-Karte stempeln
              </Text>
            </View>
            <Switch
              value={config?.nfcEnabled ?? true}
              onValueChange={(value) => updateConfig({ nfcEnabled: value })}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>
          
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>PIN-Fallback</Text>
              <Text style={styles.switchDescription}>
                Erlaubt Anmeldung per PIN wenn NFC nicht funktioniert
              </Text>
            </View>
            <Switch
              value={config?.pinFallbackEnabled ?? true}
              onValueChange={(value) => updateConfig({ pinFallbackEnabled: value })}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Statistiken */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiken</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={32} color="#60a5fa" />
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Benutzer</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="today-outline" size={32} color="#4ade80" />
              <Text style={styles.statValue}>{stats.todayCheckins}</Text>
              <Text style={styles.statLabel}>Heute gestempelt</Text>
            </View>
          </View>
        </View>

        {/* Gefahrenzone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Gefahrenzone</Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleReset}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.dangerButtonText}>Terminal zurücksetzen</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TimerMobile v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  adminButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  infoValueSmall: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOnline: {
    backgroundColor: '#4ade80',
  },
  statusOffline: {
    backgroundColor: '#ef4444',
  },
  statusLabel: {
    fontSize: 16,
    color: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  settingLabel: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12,
  },
  intervalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intervalButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  intervalButtonText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  intervalButtonTextActive: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
  },
  switchDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  dangerSection: {
    borderBottomWidth: 0,
  },
  dangerTitle: {
    color: '#ef4444',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ef4444',
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#475569',
  },
});

export default SettingsScreen;
