/**
 * User Card - Zeigt Benutzerinformationen an
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LocalUser } from '../services/database';
import type { UserStatus } from '../services/checkinService';

// ============================================================================
// TYPES
// ============================================================================

interface UserCardProps {
  user: LocalUser;
  status?: UserStatus;
  size?: 'small' | 'medium' | 'large';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UserCard({ user, status, size = 'medium' }: UserCardProps) {
  const avatarSize = size === 'small' ? 40 : size === 'medium' ? 56 : 80;
  const fontSize = size === 'small' ? 14 : size === 'medium' ? 18 : 24;

  return (
    <View style={[styles.container, styles[`container_${size}`]]}>
      {/* Avatar */}
      <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
        {user.profilePhotoUrl ? (
          <Image
            source={{ uri: user.profilePhotoUrl }}
            style={[styles.avatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
          />
        ) : (
          <Text style={[styles.avatarInitial, { fontSize: avatarSize * 0.4 }]}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        )}
        
        {/* Status-Indikator */}
        {status && (
          <View style={[
            styles.statusIndicator,
            status.isCheckedIn ? styles.statusCheckedIn : styles.statusCheckedOut,
          ]} />
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { fontSize }]}>{user.name}</Text>
        
        {user.department && (
          <Text style={styles.department}>{user.department}</Text>
        )}
        
        {status && status.isCheckedIn && (
          <View style={styles.statusRow}>
            <Ionicons name="time-outline" size={14} color="#4ade80" />
            <Text style={styles.statusText}>
              Eingecheckt seit {formatTime(status.currentSessionStart)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  container_small: {
    padding: 8,
  },
  container_medium: {
    padding: 12,
  },
  container_large: {
    padding: 16,
  },
  avatar: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  avatarInitial: {
    fontWeight: '700',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  statusCheckedIn: {
    backgroundColor: '#4ade80',
  },
  statusCheckedOut: {
    backgroundColor: '#64748b',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontWeight: '600',
    color: '#fff',
  },
  department: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#4ade80',
  },
});

export default UserCard;
