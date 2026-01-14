# TimerMobile - Entwicklungs- und Veröffentlichungsanleitung

Diese Anleitung führt Sie Schritt für Schritt durch die Einrichtung der Entwicklungsumgebung, das Testen und die Veröffentlichung der TimerMobile App im Google Play Store und Apple App Store.

---

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Entwicklungsumgebung einrichten](#2-entwicklungsumgebung-einrichten)
3. [Projekt klonen und starten](#3-projekt-klonen-und-starten)
4. [App auf Geräten testen](#4-app-auf-geräten-testen)
5. [App für Produktion bauen](#5-app-für-produktion-bauen)
6. [Google Play Store Veröffentlichung](#6-google-play-store-veröffentlichung)
7. [Apple App Store Veröffentlichung](#7-apple-app-store-veröffentlichung)
8. [Fehlerbehebung](#8-fehlerbehebung)

---

## 1. Voraussetzungen

### Hardware-Anforderungen

| Plattform | Minimum | Empfohlen |
|-----------|---------|-----------|
| **macOS** (für iOS) | macOS 12 Monterey | macOS 14 Sonoma |
| **Windows/Linux** (nur Android) | 8 GB RAM | 16 GB RAM |
| **Speicherplatz** | 20 GB frei | 50 GB frei |

### Software-Anforderungen

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | 18.x oder höher | https://nodejs.org |
| **Git** | 2.x | https://git-scm.com |
| **VS Code** | Aktuell | https://code.visualstudio.com |
| **Android Studio** | 2023.x oder höher | https://developer.android.com/studio |
| **Xcode** (nur macOS) | 15.x oder höher | Mac App Store |

### Konten (für Veröffentlichung)

| Konto | Kosten | Link |
|-------|--------|------|
| **Google Play Console** | 25 USD (einmalig) | https://play.google.com/console |
| **Apple Developer Program** | 99 USD/Jahr | https://developer.apple.com/programs |
| **Expo Account** | Kostenlos | https://expo.dev |

---

## 2. Entwicklungsumgebung einrichten

### 2.1 Node.js installieren

**Windows/macOS:**
1. Laden Sie Node.js LTS von https://nodejs.org herunter
2. Führen Sie den Installer aus
3. Überprüfen Sie die Installation:
   ```bash
   node --version
   npm --version
   ```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.2 VS Code installieren und konfigurieren

1. Laden Sie VS Code von https://code.visualstudio.com herunter
2. Installieren Sie folgende Extensions:
   - **ES7+ React/Redux/React-Native snippets**
   - **Prettier - Code formatter**
   - **ESLint**
   - **React Native Tools** (Microsoft)
   - **Expo Tools**

**Extensions installieren (Terminal):**
```bash
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension msjsdiag.vscode-react-native
code --install-extension expo.vscode-expo-tools
```

### 2.3 Android Studio installieren (für Android-Entwicklung)

1. Laden Sie Android Studio von https://developer.android.com/studio herunter
2. Führen Sie den Installer aus und wählen Sie "Standard Installation"
3. Nach dem Start: **More Actions → SDK Manager**
4. Installieren Sie unter "SDK Platforms":
   - Android 14.0 (API 34)
   - Android 13.0 (API 33)
5. Installieren Sie unter "SDK Tools":
   - Android SDK Build-Tools
   - Android Emulator
   - Android SDK Platform-Tools
   - Intel x86 Emulator Accelerator (HAXM)

**Umgebungsvariablen setzen:**

**Windows (PowerShell als Admin):**
```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("Path", "$env:Path;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator", "User")
```

**macOS/Linux (~/.bashrc oder ~/.zshrc):**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 2.4 Android Emulator erstellen

1. Android Studio öffnen
2. **More Actions → Virtual Device Manager**
3. **Create Device** klicken
4. Wählen Sie: **Tablet → Pixel Tablet** (oder ein anderes Tablet)
5. System Image: **API 34 (Android 14)**
6. **Finish** klicken

**Emulator starten (Terminal):**
```bash
emulator -avd Pixel_Tablet_API_34
```

### 2.5 Xcode installieren (nur macOS, für iOS)

1. Öffnen Sie den Mac App Store
2. Suchen Sie nach "Xcode" und installieren Sie es
3. Nach der Installation, öffnen Sie Terminal:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app
   sudo xcodebuild -license accept
   ```
4. Installieren Sie die Command Line Tools:
   ```bash
   xcode-select --install
   ```

### 2.6 Expo CLI installieren

```bash
npm install -g expo-cli eas-cli
```

Überprüfen Sie die Installation:
```bash
expo --version
eas --version
```

---

## 3. Projekt klonen und starten

### 3.1 Repository klonen

```bash
# Mit GitHub CLI
gh repo clone xdarkoy/TimerMobile

# Oder mit Git
git clone https://github.com/xdarkoy/TimerMobile.git

cd TimerMobile
```

### 3.2 Abhängigkeiten installieren

```bash
npm install
```

### 3.3 Entwicklungsserver starten

```bash
npx expo start
```

Sie sehen nun einen QR-Code und mehrere Optionen:
- **a** - Android Emulator öffnen
- **i** - iOS Simulator öffnen (nur macOS)
- **w** - Web-Browser öffnen
- **r** - App neu laden

### 3.4 App auf physischem Gerät testen

1. Installieren Sie **Expo Go** auf Ihrem Tablet:
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)
2. Scannen Sie den QR-Code mit der Expo Go App
3. Die App wird auf Ihrem Gerät geladen

---

## 4. App auf Geräten testen

### 4.1 Android Emulator

```bash
# Emulator starten (falls nicht bereits gestartet)
emulator -avd Pixel_Tablet_API_34

# In einem neuen Terminal
cd TimerMobile
npx expo start --android
```

### 4.2 iOS Simulator (nur macOS)

```bash
npx expo start --ios
```

### 4.3 Physisches Android-Gerät (USB-Debugging)

1. Aktivieren Sie **Entwickleroptionen** auf dem Gerät:
   - Einstellungen → Über das Telefon → 7x auf "Build-Nummer" tippen
2. Aktivieren Sie **USB-Debugging**:
   - Einstellungen → Entwickleroptionen → USB-Debugging
3. Verbinden Sie das Gerät per USB
4. Überprüfen Sie die Verbindung:
   ```bash
   adb devices
   ```
5. Starten Sie die App:
   ```bash
   npx expo start --android
   ```

---

## 5. App für Produktion bauen

### 5.1 Expo Account einrichten

```bash
# Bei Expo anmelden
eas login

# Projekt mit Expo verknüpfen
eas init
```

### 5.2 eas.json konfigurieren

Erstellen Sie `eas.json` im Projektroot:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 5.3 Android APK/AAB bauen

**Preview APK (zum Testen):**
```bash
eas build --platform android --profile preview
```

**Production AAB (für Play Store):**
```bash
eas build --platform android --profile production
```

Nach dem Build erhalten Sie einen Download-Link für die APK/AAB-Datei.

### 5.4 iOS IPA bauen (nur macOS)

```bash
eas build --platform ios --profile production
```

---

## 6. Google Play Store Veröffentlichung

### 6.1 Google Play Console einrichten

1. Gehen Sie zu https://play.google.com/console
2. Erstellen Sie ein Entwicklerkonto (25 USD einmalig)
3. Klicken Sie auf **App erstellen**
4. Füllen Sie die App-Details aus:
   - App-Name: **TimerMobile**
   - Standardsprache: **Deutsch**
   - App-Typ: **App**
   - Kategorie: **Produktivität**

### 6.2 Store-Eintrag vorbereiten

**Erforderliche Assets:**

| Asset | Größe | Format |
|-------|-------|--------|
| App-Icon | 512 x 512 px | PNG (32-bit) |
| Feature-Grafik | 1024 x 500 px | PNG/JPEG |
| Screenshots (Tablet) | min. 1080 px | PNG/JPEG |
| Screenshots (Handy) | min. 1080 px | PNG/JPEG |

**Texte:**
- Kurzbeschreibung (max. 80 Zeichen)
- Vollständige Beschreibung (max. 4000 Zeichen)
- Datenschutzerklärung-URL

### 6.3 App hochladen

1. Navigieren Sie zu **Produktion → Neuen Release erstellen**
2. Laden Sie die AAB-Datei hoch (aus Schritt 5.3)
3. Fügen Sie Release-Notizen hinzu
4. Klicken Sie auf **Release überprüfen**
5. Klicken Sie auf **Rollout starten**

### 6.4 Automatische Veröffentlichung mit EAS

```bash
# Google Play Service Account JSON erstellen
# (In Google Cloud Console → IAM → Service Accounts)

# In eas.json hinzufügen:
# "submit": {
#   "production": {
#     "android": {
#       "serviceAccountKeyPath": "./google-play-key.json"
#     }
#   }
# }

# Build und Submit in einem Schritt
eas build --platform android --profile production --auto-submit
```

---

## 7. Apple App Store Veröffentlichung

### 7.1 Apple Developer Program beitreten

1. Gehen Sie zu https://developer.apple.com/programs
2. Melden Sie sich mit Ihrer Apple ID an
3. Treten Sie dem Programm bei (99 USD/Jahr)

### 7.2 App Store Connect einrichten

1. Gehen Sie zu https://appstoreconnect.apple.com
2. Klicken Sie auf **Meine Apps → +**
3. Füllen Sie die App-Details aus:
   - Name: **TimerMobile**
   - Primäre Sprache: **Deutsch**
   - Bundle ID: (aus app.json)
   - SKU: **timermobile-001**

### 7.3 Store-Eintrag vorbereiten

**Erforderliche Assets:**

| Asset | Größe | Gerät |
|-------|-------|-------|
| Screenshots | 2048 x 2732 px | iPad Pro 12.9" |
| Screenshots | 2732 x 2048 px | iPad Pro 12.9" (Landscape) |
| App-Icon | 1024 x 1024 px | Alle |

**Texte:**
- Untertitel (max. 30 Zeichen)
- Beschreibung (max. 4000 Zeichen)
- Keywords (max. 100 Zeichen)
- Support-URL
- Datenschutz-URL

### 7.4 App hochladen

**Mit EAS:**
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

**Manuell mit Transporter:**
1. Laden Sie "Transporter" aus dem Mac App Store
2. Öffnen Sie die IPA-Datei mit Transporter
3. Klicken Sie auf "Deliver"

### 7.5 App zur Überprüfung einreichen

1. In App Store Connect → Meine Apps → TimerMobile
2. Wählen Sie den hochgeladenen Build
3. Füllen Sie alle erforderlichen Felder aus
4. Klicken Sie auf **Zur Überprüfung einreichen**

Die Überprüfung dauert in der Regel 24-48 Stunden.

---

## 8. Fehlerbehebung

### Häufige Probleme

**Problem: "SDK location not found"**
```bash
# Android SDK Pfad setzen
export ANDROID_HOME=$HOME/Android/Sdk
```

**Problem: "Unable to load script"**
```bash
# Metro Bundler Cache löschen
npx expo start --clear
```

**Problem: "Build failed" bei EAS**
```bash
# Logs anzeigen
eas build:view

# Lokalen Build testen
npx expo prebuild
cd android && ./gradlew assembleDebug
```

**Problem: iOS Simulator startet nicht**
```bash
# Xcode Command Line Tools neu installieren
sudo xcode-select --reset
xcode-select --install
```

### Nützliche Befehle

```bash
# Expo Doctor (Probleme diagnostizieren)
npx expo-doctor

# Cache komplett löschen
rm -rf node_modules
rm -rf .expo
npm install

# Android Build lokal
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease

# iOS Build lokal (nur macOS)
npx expo prebuild --platform ios
cd ios && xcodebuild -workspace TimerMobile.xcworkspace -scheme TimerMobile -configuration Release
```

---

## Zusammenfassung der Schritte

| Schritt | Befehl | Beschreibung |
|---------|--------|--------------|
| 1 | `npm install` | Abhängigkeiten installieren |
| 2 | `npx expo start` | Entwicklungsserver starten |
| 3 | `eas login` | Bei Expo anmelden |
| 4 | `eas build --platform android` | Android-Build erstellen |
| 5 | `eas build --platform ios` | iOS-Build erstellen |
| 6 | `eas submit --platform android` | An Play Store senden |
| 7 | `eas submit --platform ios` | An App Store senden |

---

## Support

Bei Fragen oder Problemen:
- **Expo Dokumentation:** https://docs.expo.dev
- **React Native Docs:** https://reactnative.dev
- **GitHub Issues:** https://github.com/xdarkoy/TimerMobile/issues
