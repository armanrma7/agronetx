import React from 'react'
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native'
import { AuthProvider } from './src/context/AuthContext'
import { AppNavigator } from './src/navigation/AppNavigator'
import { colors } from './src/theme/colors'

// Initialize i18n (side effects: registers react-i18next + loads persisted language)
import './src/i18n'

export default function App() {
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


