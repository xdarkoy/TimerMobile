/**
 * NFC Service - Verwaltet NFC-Kartenlesung für Check-in/Check-out
 */

import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createHash } from './cryptoService';

// ============================================================================
// TYPES
// ============================================================================

export interface NfcReadResult {
  success: boolean;
  cardUid: string | null;
  cardUidHash: string | null;
  cardType: string | null;
  error?: string;
}

export interface NfcStatus {
  isSupported: boolean;
  isEnabled: boolean;
}

// ============================================================================
// NFC SERVICE
// ============================================================================

class NfcService {
  private isInitialized = false;
  private isReading = false;
  private onCardReadCallback: ((result: NfcReadResult) => void) | null = null;

  /**
   * Initialisiert den NFC-Manager
   */
  async initialize(): Promise<boolean> {
    try {
      const supported = await NfcManager.isSupported();
      
      if (!supported) {
        console.log('NFC is not supported on this device');
        return false;
      }

      await NfcManager.start();
      this.isInitialized = true;
      
      console.log('NFC Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize NFC:', error);
      return false;
    }
  }

  /**
   * Prüft den NFC-Status
   */
  async getStatus(): Promise<NfcStatus> {
    try {
      const isSupported = await NfcManager.isSupported();
      const isEnabled = isSupported ? await NfcManager.isEnabled() : false;
      
      return { isSupported, isEnabled };
    } catch (error) {
      console.error('Failed to get NFC status:', error);
      return { isSupported: false, isEnabled: false };
    }
  }

  /**
   * Startet das kontinuierliche Lesen von NFC-Karten
   */
  async startContinuousReading(
    onCardRead: (result: NfcReadResult) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.onCardReadCallback = onCardRead;
    this.isReading = true;

    // Kontinuierliche Lesung starten
    this.readLoop();
  }

  /**
   * Stoppt das kontinuierliche Lesen
   */
  stopContinuousReading(): void {
    this.isReading = false;
    this.onCardReadCallback = null;
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }

  /**
   * Liest eine einzelne NFC-Karte
   */
  async readSingleCard(): Promise<NfcReadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Technologie anfordern
      await NfcManager.requestTechnology([
        NfcTech.NfcA,
        NfcTech.NfcB,
        NfcTech.NfcF,
        NfcTech.NfcV,
        NfcTech.IsoDep,
        NfcTech.MifareClassic,
        NfcTech.MifareUltralight,
      ]);

      // Tag lesen
      const tag = await NfcManager.getTag();

      if (!tag || !tag.id) {
        throw new Error('No tag ID found');
      }

      // Karten-UID extrahieren
      const cardUid = tag.id;
      const cardUidHash = await createHash(cardUid);
      
      // Kartentyp bestimmen
      const cardType = this.determineCardType(tag);

      // Haptisches Feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      return {
        success: true,
        cardUid,
        cardUidHash,
        cardType,
      };
    } catch (error) {
      console.error('NFC read error:', error);
      
      // Haptisches Feedback für Fehler
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      return {
        success: false,
        cardUid: null,
        cardUidHash: null,
        cardType: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      // Technologie freigeben
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }

  /**
   * Kontinuierliche Lese-Schleife
   */
  private async readLoop(): Promise<void> {
    while (this.isReading) {
      try {
        const result = await this.readSingleCard();
        
        if (result.success && this.onCardReadCallback) {
          this.onCardReadCallback(result);
        }

        // Kurze Pause zwischen Lesungen
        await this.delay(500);
      } catch (error) {
        // Bei Fehler kurz warten und erneut versuchen
        await this.delay(1000);
      }
    }
  }

  /**
   * Bestimmt den Kartentyp basierend auf Tag-Informationen
   */
  private determineCardType(tag: any): string {
    if (tag.techTypes) {
      if (tag.techTypes.includes('android.nfc.tech.MifareClassic')) {
        return 'mifare_classic';
      }
      if (tag.techTypes.includes('android.nfc.tech.MifareUltralight')) {
        return 'mifare_ultralight';
      }
      if (tag.techTypes.includes('android.nfc.tech.IsoDep')) {
        return 'desfire';
      }
    }
    
    // iOS-spezifische Erkennung
    if (Platform.OS === 'ios') {
      // iOS gibt weniger Details, aber wir können die UID-Länge nutzen
      if (tag.id && tag.id.length === 8) {
        return 'mifare_classic';
      }
      if (tag.id && tag.id.length === 14) {
        return 'mifare_ultralight';
      }
    }

    return 'other';
  }

  /**
   * Hilfsfunktion für Verzögerung
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Bereinigt den NFC-Manager
   */
  async cleanup(): Promise<void> {
    this.stopContinuousReading();
    
    if (this.isInitialized) {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        // Ignorieren
      }
    }
  }
}

// Singleton-Instanz exportieren
export const nfcService = new NfcService();
export default nfcService;
