/**
 * Admin Screen - Erweiterte Verwaltungsfunktionen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { database, LocalUser } from '../services/database';
import { checkinService, CheckinRecord } from '../services/checkinService';
import { syncService } from '../services/syncService';
import type { RootStackParamList } from '../../App';

// ============================================================================
// TYPES
// ============================================================================

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Admin'>;

type TabType = 'users' | 'logs' | 'pending';

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [pendingCheckins, setPendingCheckins] = useState<CheckinRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Daten laden
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, activeTab]);

  const loadData = async () => {
    if (activeTab === 'users') {
      const allUsers = await database.getAllUsers();
      setUsers(allUsers);
    } else if (activeTab === 'logs') {
      const todayCheckins = await checkinService.getTodayCheckins();
      setCheckins(todayCheckins);
    } else if (activeTab === 'pending') {
      const pending = await checkinService.getPendingCheckins();
      setPendingCheckins(pending);
    }
  };

  // Admin-Authentifizierung
  const handleAdminAuth = () => {
    // Standard-Admin-PIN (sollte in Produktion konfigurierbar sein)
    if (adminPin === '1234') {
      setIsAuthenticated(true);
    } else {
      Alert.alert('Fehler', 'Falsche Admin-PIN');
    }
  };

  // Benutzer filtern
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.personnelNumber?.includes(searchQuery)
  );

  // Zeit formatieren
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('de-DE');
  };

  // Check-Type Label
  const getCheckTypeLabel = (type: string) => {
    switch (type) {
      case 'check_in': return 'Anmeldung';
      case 'check_out': return 'Abmeldung';
      case 'break_start': return 'Pause Start';
      case 'break_end': return 'Pause Ende';
      default: return type;
    }
  };

  // Sync-Status Label
  const getSyncStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Ausstehend', color: '#f59e0b' };
      case 'synced': return { label: 'Synchronisiert', color: '#4ade80' };
      case 'failed': return { label: 'Fehlgeschlagen', color: '#ef4444' };
      case 'conflict': return { label: 'Konflikt', color: '#8b5cf6' };
      default: return { label: status, color: '#64748b' };
    }
  };

  // Pending manuell synchronisieren
  const handleRetrySync = async () => {
    await syncService.forceSync();
    loadData();
    Alert.alert('Synchronisation', 'Synchronisation abgeschlossen');
  };

  // Auth Screen
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        
        <View style={styles.authContainer}>
          <Ionicons name="shield-checkmark-outline" size={80} color="#3b82f6" />
          <Text style={styles.authTitle}>Admin-Bereich</Text>
          <Text style={styles.authSubtitle}>
            Bitte Admin-PIN eingeben
          </Text>
          
          <TextInput
            style={styles.pinInput}
            value={adminPin}
            onChangeText={setAdminPin}
            placeholder="PIN"
            placeholderTextColor="#64748b"
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />
          
          <View style={styles.authButtons}>
            <TouchableOpacity
              style={styles.authButtonSecondary}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.authButtonSecondaryText}>Abbrechen</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.authButtonPrimary}
              onPress={handleAdminAuth}
            >
              <Text style={styles.authButtonPrimaryText}>Anmelden</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Administration</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadData}
        >
          <Ionicons name="refresh-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={activeTab === 'users' ? '#3b82f6' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            Benutzer ({users.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'logs' && styles.tabActive]}
          onPress={() => setActiveTab('logs')}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={activeTab === 'logs' ? '#3b82f6' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>
            Heute ({checkins.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={20}
            color={activeTab === 'pending' ? '#3b82f6' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Ausstehend ({pendingCheckins.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'users' && (
        <View style={styles.content}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Benutzer suchen..."
            placeholderTextColor="#64748b"
          />
          
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitial}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userDetails}>
                    {item.personnelNumber || 'Keine Personalnummer'} • {item.department || 'Keine Abteilung'}
                  </Text>
                </View>
                <View style={styles.userBadges}>
                  {item.nfcCardHash && (
                    <View style={styles.badge}>
                      <Ionicons name="card-outline" size={14} color="#4ade80" />
                    </View>
                  )}
                  {item.pinHash && (
                    <View style={styles.badge}>
                      <Ionicons name="keypad-outline" size={14} color="#60a5fa" />
                    </View>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#475569" />
                <Text style={styles.emptyText}>Keine Benutzer gefunden</Text>
              </View>
            }
          />
        </View>
      )}

      {activeTab === 'logs' && (
        <FlatList
          style={styles.content}
          data={checkins}
          keyExtractor={(item) => item.localId}
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <View style={styles.logTime}>
                <Text style={styles.logTimeText}>{formatTime(item.timestamp)}</Text>
              </View>
              <View style={styles.logInfo}>
                <Text style={styles.logName}>{item.userName}</Text>
                <Text style={styles.logType}>{getCheckTypeLabel(item.checkType)}</Text>
              </View>
              <View style={styles.logMethod}>
                <Ionicons
                  name={item.authMethod === 'nfc' ? 'card-outline' : 'keypad-outline'}
                  size={20}
                  color="#64748b"
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>Keine Einträge heute</Text>
            </View>
          }
        />
      )}

      {activeTab === 'pending' && (
        <View style={styles.content}>
          {pendingCheckins.length > 0 && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleRetrySync}
            >
              <Ionicons name="sync-outline" size={20} color="#fff" />
              <Text style={styles.syncButtonText}>Alle synchronisieren</Text>
            </TouchableOpacity>
          )}
          
          <FlatList
            data={pendingCheckins}
            keyExtractor={(item) => item.localId}
            renderItem={({ item }) => {
              const status = getSyncStatusLabel(item.syncStatus);
              return (
                <View style={styles.pendingCard}>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingName}>{item.userName}</Text>
                    <Text style={styles.pendingDetails}>
                      {getCheckTypeLabel(item.checkType)} • {formatDateTime(item.timestamp)}
                    </Text>
                    {item.syncError && (
                      <Text style={styles.pendingError}>{item.syncError}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#4ade80" />
                <Text style={styles.emptyText}>Alle Einträge synchronisiert</Text>
              </View>
            }
          />
        </View>
      )}
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
  refreshButton: {
    padding: 8,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
  },
  authSubtitle: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 8,
  },
  pinInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    width: 200,
    marginTop: 32,
    letterSpacing: 8,
  },
  authButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  authButtonPrimary: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  authButtonPrimaryText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  authButtonSecondary: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },
  authButtonSecondaryText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userDetails: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  logTime: {
    width: 60,
  },
  logTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logInfo: {
    flex: 1,
    marginLeft: 16,
  },
  logName: {
    fontSize: 16,
    color: '#fff',
  },
  logType: {
    fontSize: 14,
    color: '#64748b',
  },
  logMethod: {
    padding: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  syncButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pendingDetails: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  pendingError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#475569',
    marginTop: 16,
  },
});

export default AdminScreen;
