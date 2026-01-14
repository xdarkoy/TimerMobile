/**
 * Setup Screen - Terminal-Registrierung und Erstkonfiguration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTerminalStore } from '../stores/terminalStore';
import { generateTerminalId } from '../services/cryptoService';
import type { TerminalConfig } from '../services/database';
import type { RootStackParamList } from '../../App';

// ============================================================================
// TYPES
// ============================================================================

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Setup'>;

// ============================================================================
// COMPONENT
// ============================================================================

export function SetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { registerTerminal } = useTerminalStore();

  const [step, setStep] = useState<'welcome' | 'config' | 'connecting'>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formular-Daten
  const [serverUrl, setServerUrl] = useState('https://timer.example.com');
  const [apiKey, setApiKey] = useState('');
  const [terminalName, setTerminalName] = useState('');
  const [location, setLocation] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Terminal registrieren
  const handleRegister = async () => {
    if (!serverUrl || !apiKey || !terminalName || !tenantId) {
      setError('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('connecting');

    try {
      const config: TerminalConfig = {
        terminalId: generateTerminalId(),
        tenantId: parseInt(tenantId, 10),
        name: terminalName,
        location: location || undefined,
        apiKey,
        serverUrl,
        syncIntervalSeconds: 60,
        offlineBufferHours: 72,
        nfcEnabled: true,
        pinFallbackEnabled: true,
        timezone: 'Europe/Berlin',
        language: 'de',
      };

      await registerTerminal(config);
      navigation.replace('Checkin');
    } catch (err) {
      console.error('Registration failed:', err);
      setError('Registrierung fehlgeschlagen. Bitte Daten prüfen.');
      setStep('config');
    } finally {
      setIsLoading(false);
    }
  };

  // QR-Code scannen (Platzhalter)
  const handleScanQR = () => {
    // TODO: QR-Code Scanner implementieren
    setError('QR-Code Scanner wird noch implementiert');
  };

  // Welcome Screen
  if (step === 'welcome') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        
        <View style={styles.welcomeContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="time-outline" size={120} color="#3b82f6" />
          </View>
          
          <Text style={styles.welcomeTitle}>TimerMobile</Text>
          <Text style={styles.welcomeSubtitle}>
            NFC Check-in/Check-out Terminal
          </Text>
          
          <Text style={styles.welcomeDescription}>
            Dieses Terminal muss mit Ihrem Timer-Server verbunden werden.
            Halten Sie die Zugangsdaten bereit.
          </Text>

          <View style={styles.welcomeButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep('config')}
            >
              <Ionicons name="settings-outline" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Manuell konfigurieren</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleScanQR}
            >
              <Ionicons name="qr-code-outline" size={24} color="#3b82f6" />
              <Text style={styles.secondaryButtonText}>QR-Code scannen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Connecting Screen
  if (step === 'connecting') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        
        <View style={styles.connectingContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.connectingTitle}>Verbinde mit Server...</Text>
          <Text style={styles.connectingSubtitle}>
            Terminal wird registriert und Benutzerdaten werden synchronisiert
          </Text>
        </View>
      </View>
    );
  }

  // Config Screen
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('welcome')}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terminal einrichten</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Server URL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL *</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://timer.example.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Mandanten-ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mandanten-ID *</Text>
            <TextInput
              style={styles.input}
              value={tenantId}
              onChangeText={setTenantId}
              placeholder="z.B. 1"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
            />
          </View>

          {/* API-Key */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>API-Schlüssel *</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Ihr Terminal-API-Schlüssel"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          {/* Terminal-Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Terminal-Name *</Text>
            <TextInput
              style={styles.input}
              value={terminalName}
              onChangeText={setTerminalName}
              placeholder="z.B. Eingang Hauptgebäude"
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Standort */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Standort (optional)</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="z.B. Gebäude A, Erdgeschoss"
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Info-Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#60a5fa" />
            <Text style={styles.infoText}>
              Die Zugangsdaten erhalten Sie von Ihrem Administrator im Timer-Webportal
              unter Einstellungen → Terminals.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Terminal registrieren</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  logoContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  welcomeSubtitle: {
    fontSize: 20,
    color: '#94a3b8',
    marginTop: 8,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 32,
    maxWidth: 500,
    lineHeight: 24,
  },
  welcomeButtons: {
    marginTop: 48,
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    gap: 12,
  },
  secondaryButtonText: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '600',
  },
  connectingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  connectingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
  },
  connectingSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#450a0a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 16,
    flex: 1,
  },
  form: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 32,
    gap: 12,
  },
  infoText: {
    color: '#93c5fd',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 18,
    borderRadius: 12,
    gap: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
});

export default SetupScreen;
