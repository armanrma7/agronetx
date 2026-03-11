import React, { useEffect } from 'react'
import { StatusBar } from 'react-native'
import { AuthProvider } from './src/context/AuthContext'
import { AppNavigator } from './src/navigation/AppNavigator'
import { colors } from './src/theme/colors'
import { setupTokenRefreshListener, setupForegroundMessageHandler } from './src/services/deviceToken.service'

// Initialize i18n (side effects: registers react-i18next + loads persisted language)
import './src/i18n'

export default function App() {
  useEffect(() => {
    // Show notifications when app is in foreground (Android: Alert; iOS: via firebase.json)
    const unsubForeground = setupForegroundMessageHandler()
    // Listen for FCM token refresh and re-register with backend
    const unsubToken = setupTokenRefreshListener()

    return () => {
      unsubForeground()
      unsubToken()
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



