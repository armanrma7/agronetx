import React, { useEffect } from 'react'
import { StatusBar } from 'react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './src/context/AuthContext'
import { AppNavigator } from './src/navigation/AppNavigator'
import { colors } from './src/theme/colors'
import { setupTokenRefreshListener, setupForegroundMessageHandler } from './src/services/deviceToken.service'

// Initialize i18n (side effects: registers react-i18next + loads persisted language)
import './src/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min — data is fresh, no background refetch
      gcTime: 10 * 60 * 1000,     // 10 min — keep unused cache before garbage-collecting
      retry: 2,
      refetchOnWindowFocus: false, // mobile: no browser focus events
    },
    mutations: {
      retry: 0,
    },
  },
})

export default function App() {
  useEffect(() => {
    const unsubForeground = setupForegroundMessageHandler()
    const unsubToken = setupTokenRefreshListener()
    return () => {
      unsubForeground()
      unsubToken()
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.buttonPrimary}
        translucent={false}
      />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </QueryClientProvider>
  )
}



