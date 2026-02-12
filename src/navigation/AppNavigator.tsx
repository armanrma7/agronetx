import React, { useMemo, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { LoginPage, RegisterPage, ForgotPasswordPage, VerificationPage } from '../pages/auth'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { LanguagesPage } from '../pages/settings'
import { NewAnnouncementFormPage, AnnouncementDetailPage, ApplicationFormPage } from '../pages/main'
import { HomeTabs } from './HomeTabs'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Pressable, Platform } from 'react-native'
import { colors } from '../theme/colors'
import Icon from '../components/Icon'

// ✅ Disable iOS glass effect at native level (iOS only)
if (Platform.OS === 'ios') {
  try {
    const { NativeModules } = require('react-native')
    // Attempt to disable iOS blur effects at system level
    if (NativeModules.RNGestureHandlerModule) {
      // Disable native animations that might cause glass effects
    }
  } catch (e) {
    // Ignore if modules not available
  }
}

const AuthStack = createNativeStackNavigator()
const MainStack = createNativeStackNavigator()

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        // ✅ Remove all glass effects (native-stack compatible)
        headerTransparent: false,
        headerBlurEffect: undefined,
        headerLargeTitle: false,
        headerShadowVisible: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginPage} />
      <AuthStack.Screen name="Register" component={RegisterPage} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordPage} />
      <AuthStack.Screen name="Verification" component={VerificationPage} />
    </AuthStack.Navigator>
  )
}

export function AppNavigator() {
  const { user, loading, initialized } = useAuth()
  
  // Only show initial loading on first app launch, not during login/register
  const [initialLoad, setInitialLoad] = React.useState(true)

  React.useEffect(() => {
    if (!loading && initialized) {
      setInitialLoad(false)
    }
  }, [loading, initialized])

  const navigator = useMemo(() => {
    // Wait for initialization to complete before deciding which navigator to show
    // This prevents showing login screen when user is already logged in
    if (!initialized) {
      return null // Return null while initializing
    }
    
    if (user) {
      return (
        <MainStack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            // ✅ Remove all glass effects globally (native-stack compatible)
            headerTransparent: false,
            headerBlurEffect: undefined,
            headerLargeTitle: false,
            headerShadowVisible: false,
            gestureEnabled: true,
          }}
        >
          <MainStack.Screen name="HomeTabs" component={HomeTabs} />
          <MainStack.Screen 
            name="Profile" 
            component={ProfilePage}
            options={{
              presentation: 'card',
              headerShown: false,
              headerTransparent: false,
              headerBlurEffect: undefined,
              headerLargeTitle: false,
              headerShadowVisible: false,
            }}
          />
          <MainStack.Screen 
            name="Languages" 
            component={LanguagesPage}
            options={{
              presentation: 'card',
              headerShown: false,
              headerTransparent: false,
              headerBlurEffect: undefined,
              headerLargeTitle: false,
              headerShadowVisible: false,
            }}
          />
          <MainStack.Screen 
            name="NewAnnouncementForm" 
            component={NewAnnouncementFormPage}
            options={({ navigation }) => ({
              headerShown: false,
              headerBackTitleVisible: false,
              headerBackVisible: false,
              headerBackButtonMenuEnabled: false,
              headerTitle: () => (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, color: colors.textPrimary }}>
                    Նոր
                  </Text>
                  <Text style={{ fontSize: 18, color: colors.textPrimary }}>
                    Հայտարարություն
                  </Text>
                </View>
              ),
              // ✅ Wrapped in View to prevent iOS glass container
              headerLeft: () => (
                <View style={{ marginLeft: 16, backgroundColor: 'transparent' }}>
                  <Pressable
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.6 : 1,
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#F5F5F5',
                      justifyContent: 'center',
                      alignItems: 'center',
                    })}
                  >
                    <Icon name="arrow-back" size={20} color="#4B5563" />
                  </Pressable>
                </View>
              ),
              headerStyle: {
                backgroundColor: '#FFFFFF',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              // ✅ Remove all glass effects (native-stack compatible)
              headerTransparent: false,
              headerBlurEffect: undefined,
              headerLargeTitle: false,
              headerShadowVisible: false,
              headerTintColor: colors.textPrimary,
              headerTitleAlign: 'center',
              gestureEnabled: true,
            })}
          />
        <MainStack.Screen 
          name="AnnouncementDetail" 
          component={AnnouncementDetailPage}
          options={{
            // ✅ Use fully custom header (no React Navigation header)
            headerShown: false,
            gestureEnabled: true,
            animation: 'slide_from_right',
          }}
        />
        <MainStack.Screen 
          name="ApplicationForm" 
          component={ApplicationFormPage}
          options={{
            headerShown: false,
            gestureEnabled: true,
            animation: 'slide_from_right',
          }}
        />
        </MainStack.Navigator>
      )
    }
    return <AuthNavigator />
  }, [user, initialized])

  // Show loading screen while initializing (checking saved session)
  // This prevents showing login screen when user is already logged in
  if (!initialized || (loading && initialLoad)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Բեռնվում է...</Text>
      </View>
    )
  }

  // Don't render NavigationContainer until we have a navigator
  if (!navigator) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Բեռնվում է...</Text>
      </View>
    )
  }

  return (
    <NavigationContainer>
      {navigator}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textTertiary,
  },
})

