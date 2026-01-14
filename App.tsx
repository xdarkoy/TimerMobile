/**
 * TimerMobile - NFC Check-in/Check-out App
 * 
 * Haupteinstiegspunkt der Anwendung
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Screens
import { CheckinScreen } from './src/screens/CheckinScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { AdminScreen } from './src/screens/AdminScreen';

// Services
import { initializeDatabase } from './src/services/database';
import { useTerminalStore } from './src/stores/terminalStore';

// Types
export type RootStackParamList = {
  Setup: undefined;
  Checkin: undefined;
  Settings: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isRegistered, loadTerminalConfig } = useTerminalStore();

  useEffect(() => {
    async function initialize() {
      try {
        // Datenbank initialisieren
        await initializeDatabase();
        
        // Terminal-Konfiguration laden
        await loadTerminalConfig();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsInitialized(true); // Trotzdem fortfahren
      }
    }
    
    initialize();
  }, []);

  if (!isInitialized) {
    return null; // Splash Screen wird angezeigt
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName={isRegistered ? 'Checkin' : 'Setup'}
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="Setup" component={SetupScreen} />
          <Stack.Screen name="Checkin" component={CheckinScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
