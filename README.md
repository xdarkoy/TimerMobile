# TimerMobile

NFC-basierte Check-in/Check-out App für Tablets - Companion App für [Timer](https://github.com/xdarkoy/Timer)

## Features

- **NFC Check-in/Check-out**: Mitarbeiter können mit NFC-Karte stempeln
- **PIN-Fallback**: Alternative Anmeldung per PIN wenn NFC nicht verfügbar
- **Offline-First**: Lokale Datenspeicherung mit automatischer Synchronisation
- **Konfigurierbares Sync-Intervall**: 30s bis 5min einstellbar
- **Multi-Mandanten**: Unterstützung für verschiedene Unternehmen
- **Tablet-optimiert**: UI speziell für Landscape-Modus auf Tablets

## Screenshots

| Check-in Screen | Settings | Admin |
|-----------------|----------|-------|
| Hauptbildschirm mit Uhr und NFC-Status | Terminal-Einstellungen | Benutzerverwaltung |

## Technologie-Stack

- **Framework**: React Native / Expo
- **State Management**: Zustand
- **Lokale Datenbank**: SQLite (expo-sqlite)
- **NFC**: react-native-nfc-manager
- **API-Client**: Axios
- **Navigation**: React Navigation

## Installation

### Voraussetzungen

- Node.js 18+
- Expo CLI
- Android Studio (für Android) oder Xcode (für iOS)
- Timer-Backend mit aktivierter Terminal-API

### Setup

```bash
# Repository klonen
git clone https://github.com/xdarkoy/TimerMobile.git
cd TimerMobile

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npx expo start
```

### Build für Produktion

```bash
# Android APK
eas build --platform android --profile preview

# iOS (erfordert Apple Developer Account)
eas build --platform ios --profile preview
```

## Konfiguration

### Terminal registrieren

1. App auf Tablet starten
2. "Manuell konfigurieren" wählen
3. Folgende Daten eingeben:
   - **Server URL**: URL des Timer-Backends (z.B. `https://timer.example.com`)
   - **Mandanten-ID**: ID des Mandanten im Timer-System
   - **API-Schlüssel**: Terminal-API-Key aus Timer-Admin
   - **Terminal-Name**: Eindeutiger Name (z.B. "Eingang Hauptgebäude")
   - **Standort**: Optional (z.B. "Gebäude A, EG")

### Timer-Backend vorbereiten

Im Timer-Admin unter **Einstellungen → Terminals**:

1. Neues Terminal anlegen
2. API-Schlüssel generieren
3. Benutzer dem Terminal zuweisen
4. NFC-Karten oder PINs für Benutzer konfigurieren

## Architektur

```
src/
├── components/          # Wiederverwendbare UI-Komponenten
│   ├── PinPadModal.tsx  # PIN-Eingabe
│   ├── StatusBar.tsx    # Verbindungsstatus
│   └── UserCard.tsx     # Benutzeranzeige
├── screens/             # Hauptbildschirme
│   ├── CheckinScreen.tsx    # Hauptbildschirm
│   ├── SetupScreen.tsx      # Ersteinrichtung
│   ├── SettingsScreen.tsx   # Einstellungen
│   └── AdminScreen.tsx      # Administration
├── services/            # Business-Logik
│   ├── nfcService.ts        # NFC-Kartenlesung
│   ├── checkinService.ts    # Check-in/out Logik
│   ├── database.ts          # SQLite-Datenbank
│   ├── syncService.ts       # Server-Synchronisation
│   └── cryptoService.ts     # Hashing & Signatur
├── stores/              # Zustand State Management
│   └── terminalStore.ts     # Globaler App-Zustand
└── types/               # TypeScript-Typen
```

## Offline-Modus

Die App speichert alle Check-ins lokal in SQLite und synchronisiert automatisch:

- **Sync-Intervall**: Konfigurierbar (Standard: 60 Sekunden)
- **Offline-Buffer**: Bis zu 72 Stunden lokale Speicherung
- **Konflikt-Auflösung**: Automatisch mit Server-Priorität
- **Retry-Logik**: 3 Versuche bei Sync-Fehlern

## Sicherheit

- **HMAC-Signatur**: Alle API-Requests werden signiert
- **PIN-Hashing**: PINs werden gehasht gespeichert
- **NFC-UID-Hashing**: Karten-IDs werden nicht im Klartext gespeichert
- **Admin-PIN**: Zugang zu Einstellungen geschützt

## API-Endpunkte

Die App kommuniziert mit folgenden Timer-Backend-Endpunkten:

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/terminal/register` | POST | Terminal registrieren |
| `/api/terminal/sync` | POST | Daten synchronisieren |
| `/api/terminal/heartbeat` | POST | Verbindungsstatus |
| `/api/terminal/verify-nfc` | POST | NFC-Karte verifizieren |
| `/api/terminal/verify-pin` | POST | PIN verifizieren |

## Fehlerbehebung

### NFC funktioniert nicht

1. Prüfen ob NFC auf dem Gerät aktiviert ist
2. App-Berechtigungen prüfen
3. Karte direkt auf den NFC-Sensor halten

### Synchronisation fehlgeschlagen

1. Internetverbindung prüfen
2. Server-URL in Einstellungen prüfen
3. API-Schlüssel verifizieren
4. "Jetzt synchronisieren" in Einstellungen

### Benutzer nicht erkannt

1. NFC-Karte im Timer-Backend registriert?
2. Benutzer dem Terminal zugewiesen?
3. Vollständige Synchronisation durchführen

## Lizenz

MIT License - siehe [LICENSE](LICENSE)

## Support

Bei Fragen oder Problemen:
- GitHub Issues: https://github.com/xdarkoy/TimerMobile/issues
- Timer-Dokumentation: https://github.com/xdarkoy/Timer/docs
