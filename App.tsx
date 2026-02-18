import React, { useEffect } from 'react'
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native'
import { AuthProvider } from './src/context/AuthContext'
import { AppNavigator } from './src/navigation/AppNavigator'
import { colors } from './src/theme/colors'
import { registerDeviceToken, setupTokenRefreshListener } from './src/services/deviceToken.service'

// Initialize i18n (side effects: registers react-i18next + loads persisted language)
import './src/i18n'

export default function App() {
  useEffect(() => {
    // Register device token when app opens
    registerDeviceToken()

    // Setup listener for token refresh
    const unsubscribe = setupTokenRefreshListener()

    // Cleanup listener on unmount
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={colors.buttonPrimary}
        translucent={false}
      />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})


