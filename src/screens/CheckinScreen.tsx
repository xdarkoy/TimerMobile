/**
 * Check-in Screen - Hauptbildschirm für NFC Check-in/Check-out
 * 
 * Optimiert für Tablet-Displays im Landscape-Modus
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { nfcService, NfcReadResult } from '../services/nfcService';
import { checkinService, CheckType } from '../services/checkinService';
import { database, LocalUser } from '../services/database';
import { useTerminalStore } from '../stores/terminalStore';
import { PinPadModal } from '../components/PinPadModal';
import { UserCard } from '../components/UserCard';
import { StatusBar as CustomStatusBar } from '../components/StatusBar';
import type { RootStackParamList } from '../../App';

// ============================================================================
// TYPES
// ============================================================================

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkin'>;

interface CheckinFeedback {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  userName?: string;
  action?: CheckType;
  workTime?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CheckinScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { config, isOnline, pendingCount, updateSyncStats } = useTerminalStore();
  
  const [isReading, setIsReading] = useState(false);
  const [feedback, setFeedback] = useState<CheckinFeedback | null>(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nfcStatus, setNfcStatus] = useState({ isSupported: false, isEnabled: false });

  // Zeit-Update alle Sekunde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // NFC initialisieren
  useEffect(() => {
    async function initNfc() {
      const status = await nfcService.getStatus();
      setNfcStatus(status);

      if (status.isSupported && status.isEnabled) {
        setIsReading(true);
        nfcService.startContinuousReading(handleNfcRead);
      }
    }

    initNfc();

    return () => {
      nfcService.stopContinuousReading();
    };
  }, []);

  // NFC-Karte gelesen
  const handleNfcRead = useCallback(async (result: NfcReadResult) => {
    if (!result.success || !result.cardUidHash) {
      showFeedback({
        type: 'error',
        title: 'Karte nicht erkannt',
        message: 'Bitte Karte erneut auflegen',
      });
      return;
    }

    try {
      // Benutzer suchen
      const user = await database.getUserByNfcHash(result.cardUidHash);

      if (!user) {
        showFeedback({
          type: 'error',
          title: 'Unbekannte Karte',
          message: 'Diese Karte ist nicht registriert',
        });
        return;
      }

      // Check-in/Check-out durchführen
      await performCheckin(user, 'nfc', result.cardUidHash);
    } catch (error) {
      console.error('Check-in error:', error);
      showFeedback({
        type: 'error',
        title: 'Fehler',
        message: 'Check-in fehlgeschlagen. Bitte erneut versuchen.',
      });
    }
  }, []);

  // Check-in/Check-out durchführen
  const performCheckin = async (
    user: LocalUser,
    authMethod: 'nfc' | 'pin',
    nfcCardHash?: string
  ) => {
    const { action, record } = await checkinService.toggleCheckin(
      user.id,
      user.name,
      authMethod,
      nfcCardHash
    );

    // Haptisches Feedback
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Arbeitszeit berechnen
    let workTime: string | undefined;
    if (action === 'check_out') {
      const status = await checkinService.getUserStatus(user.id);
      if (status) {
        workTime = checkinService.formatWorkTime(status.totalTodayMinutes);
      }
    }

    // Feedback anzeigen
    showFeedback({
      type: 'success',
      title: action === 'check_in' ? 'Angemeldet' : 'Abgemeldet',
      message: action === 'check_in' 
        ? 'Guten Tag und viel Erfolg!' 
        : `Arbeitszeit heute: ${workTime || '0:00'}`,
      userName: user.name,
      action,
      workTime,
    });

    // Sync-Stats aktualisieren
    await updateSyncStats();
  };

  // PIN-Eingabe verarbeiten
  const handlePinSubmit = async (pin: string) => {
    try {
      const { createPinHash } = await import('../services/cryptoService');
      const pinHash = await createPinHash(pin);
      const user = await database.getUserByPinHash(pinHash);

      if (!user) {
        showFeedback({
          type: 'error',
          title: 'Falsche PIN',
          message: 'Bitte erneut versuchen',
        });
        return;
      }

      setShowPinPad(false);
      await performCheckin(user, 'pin');
    } catch (error) {
      console.error('PIN check-in error:', error);
      showFeedback({
        type: 'error',
        title: 'Fehler',
        message: 'PIN-Prüfung fehlgeschlagen',
      });
    }
  };

  // Feedback anzeigen
  const showFeedback = (fb: CheckinFeedback) => {
    setFeedback(fb);
    
    // Feedback nach 4 Sekunden ausblenden
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Zeit formatieren
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header mit Status */}
      <CustomStatusBar
        isOnline={isOnline}
        pendingCount={pendingCount}
        terminalName={config?.name || 'Terminal'}
        onSettingsPress={() => navigation.navigate('Settings')}
      />

      {/* Hauptbereich */}
      <View style={styles.mainContent}>
        {/* Linke Seite: Uhr und Datum */}
        <View style={styles.leftPanel}>
          <Text style={styles.time}>{formatTime(currentTime)}</Text>
          <Text style={styles.date}>{formatDate(currentTime)}</Text>
          
          {/* NFC-Status */}
          <View style={styles.nfcStatus}>
            {nfcStatus.isSupported && nfcStatus.isEnabled ? (
              <>
                <Ionicons name="radio-outline" size={48} color="#4ade80" />
                <Text style={styles.nfcText}>NFC bereit</Text>
                <Text style={styles.nfcSubtext}>Karte auflegen zum Stempeln</Text>
              </>
            ) : (
              <>
                <Ionicons name="warning-outline" size={48} color="#f59e0b" />
                <Text style={styles.nfcText}>NFC nicht verfügbar</Text>
                <Text style={styles.nfcSubtext}>Bitte PIN verwenden</Text>
              </>
            )}
          </View>
        </View>

        {/* Rechte Seite: Feedback oder Aktion */}
        <View style={styles.rightPanel}>
          {feedback ? (
            <View style={[
              styles.feedbackCard,
              feedback.type === 'success' && styles.feedbackSuccess,
              feedback.type === 'error' && styles.feedbackError,
            ]}>
              <Ionicons
                name={
                  feedback.type === 'success'
                    ? feedback.action === 'check_in'
                      ? 'log-in-outline'
                      : 'log-out-outline'
                    : 'alert-circle-outline'
                }
                size={80}
                color={feedback.type === 'success' ? '#4ade80' : '#ef4444'}
              />
              <Text style={styles.feedbackTitle}>{feedback.title}</Text>
              {feedback.userName && (
                <Text style={styles.feedbackName}>{feedback.userName}</Text>
              )}
              <Text style={styles.feedbackMessage}>{feedback.message}</Text>
            </View>
          ) : (
            <View style={styles.waitingCard}>
              <View style={styles.pulseCircle}>
                <Ionicons name="finger-print-outline" size={100} color="#60a5fa" />
              </View>
              <Text style={styles.waitingTitle}>Bereit zum Stempeln</Text>
              <Text style={styles.waitingSubtitle}>
                NFC-Karte auflegen oder PIN eingeben
              </Text>
            </View>
          )}

          {/* PIN-Button */}
          {config?.pinFallbackEnabled && (
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => setShowPinPad(true)}
            >
              <Ionicons name="keypad-outline" size={24} color="#fff" />
              <Text style={styles.pinButtonText}>PIN eingeben</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {config?.location || 'TimerMobile Terminal'}
        </Text>
      </View>

      {/* PIN-Pad Modal */}
      <PinPadModal
        visible={showPinPad}
        onClose={() => setShowPinPad(false)}
        onSubmit={handlePinSubmit}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
  },
  leftPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
  },
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 24,
  },
  time: {
    fontSize: 96,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: 4,
  },
  date: {
    fontSize: 24,
    color: '#94a3b8',
    marginTop: 8,
    textTransform: 'capitalize',
  },
  nfcStatus: {
    marginTop: 48,
    alignItems: 'center',
  },
  nfcText: {
    fontSize: 20,
    color: '#fff',
    marginTop: 12,
  },
  nfcSubtext: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    width: '80%',
    maxWidth: 400,
  },
  feedbackSuccess: {
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  feedbackError: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  feedbackTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  feedbackName: {
    fontSize: 28,
    color: '#60a5fa',
    marginTop: 8,
  },
  feedbackMessage: {
    fontSize: 18,
    color: '#94a3b8',
    marginTop: 12,
    textAlign: 'center',
  },
  waitingCard: {
    alignItems: 'center',
  },
  pulseCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#334155',
  },
  waitingTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
  },
  waitingSubtitle: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 8,
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 48,
  },
  pinButtonText: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  footerText: {
    fontSize: 14,
    color: '#475569',
  },
});

export default CheckinScreen;
