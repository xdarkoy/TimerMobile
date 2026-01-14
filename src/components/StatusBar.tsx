/**
 * Status Bar - Zeigt Verbindungsstatus und Terminal-Info
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// TYPES
// ============================================================================

interface StatusBarProps {
  isOnline: boolean;
  pendingCount: number;
  terminalName: string;
  onSettingsPress: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StatusBar({
  isOnline,
  pendingCount,
  terminalName,
  onSettingsPress,
}: StatusBarProps) {
  return (
    <View style={styles.container}>
      {/* Terminal-Name */}
      <View style={styles.leftSection}>
        <Ionicons name="tablet-portrait-outline" size={20} color="#64748b" />
        <Text style={styles.terminalName}>{terminalName}</Text>
      </View>

      {/* Status-Indikatoren */}
      <View style={styles.centerSection}>
        {/* Online-Status */}
        <View style={styles.statusItem}>
          <View style={[
            styles.statusDot,
            isOnline ? styles.statusOnline : styles.statusOffline,
          ]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {/* Pending-Zähler */}
        {pendingCount > 0 && (
          <View style={styles.statusItem}>
            <Ionicons name="cloud-upload-outline" size={18} color="#f59e0b" />
            <Text style={[styles.statusText, styles.pendingText]}>
              {pendingCount} ausstehend
            </Text>
          </View>
        )}
      </View>

      {/* Einstellungen-Button */}
      <TouchableOpacity style={styles.settingsButton} onPress={onSettingsPress}>
        <Ionicons name="settings-outline" size={24} color="#64748b" />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  terminalName: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOnline: {
    backgroundColor: '#4ade80',
  },
  statusOffline: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  pendingText: {
    color: '#f59e0b',
  },
  settingsButton: {
    padding: 8,
  },
});

export default StatusBar;
