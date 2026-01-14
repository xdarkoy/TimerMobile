/**
 * PIN-Pad Modal - Numerische Tastatur für PIN-Eingabe
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// ============================================================================
// TYPES
// ============================================================================

interface PinPadModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  title?: string;
  maxLength?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PinPadModal({
  visible,
  onClose,
  onSubmit,
  title = 'PIN eingeben',
  maxLength = 6,
}: PinPadModalProps) {
  const [pin, setPin] = useState('');

  // Taste drücken
  const handlePress = async (value: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value === 'delete') {
      setPin((prev) => prev.slice(0, -1));
    } else if (value === 'clear') {
      setPin('');
    } else if (value === 'submit') {
      if (pin.length >= 4) {
        onSubmit(pin);
        setPin('');
      }
    } else if (pin.length < maxLength) {
      setPin((prev) => prev + value);
    }
  };

  // Modal schließen
  const handleClose = () => {
    setPin('');
    onClose();
  };

  // PIN-Anzeige
  const renderPinDisplay = () => {
    const dots = [];
    for (let i = 0; i < maxLength; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            i < pin.length && styles.pinDotFilled,
          ]}
        />
      );
    }
    return dots;
  };

  // Tastatur-Buttons
  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'delete'],
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* PIN-Anzeige */}
          <View style={styles.pinDisplay}>
            {renderPinDisplay()}
          </View>

          {/* Tastatur */}
          <View style={styles.keypad}>
            {buttons.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.key,
                      key === 'clear' && styles.keyAction,
                      key === 'delete' && styles.keyAction,
                    ]}
                    onPress={() => handlePress(key)}
                  >
                    {key === 'delete' ? (
                      <Ionicons name="backspace-outline" size={28} color="#fff" />
                    ) : key === 'clear' ? (
                      <Text style={styles.keyActionText}>C</Text>
                    ) : (
                      <Text style={styles.keyText}>{key}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              pin.length < 4 && styles.submitButtonDisabled,
            ]}
            onPress={() => handlePress('submit')}
            disabled={pin.length < 4}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
            <Text style={styles.submitButtonText}>Bestätigen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const { width } = Dimensions.get('window');
const keySize = Math.min(width * 0.15, 80);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
    width: Math.min(width * 0.9, 400),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: '#475569',
  },
  pinDotFilled: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  keypad: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  key: {
    width: keySize,
    height: keySize,
    borderRadius: keySize / 2,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyAction: {
    backgroundColor: '#0f172a',
  },
  keyText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  keyActionText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#94a3b8',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PinPadModal;
