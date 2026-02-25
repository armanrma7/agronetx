import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Linking, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors } from '../../theme/colors'

export function LoginPage() {
  const navigation = useNavigation()
  const { t } = useTranslation()
  const { login, loading, error } = useAuth()
  const [phoneOrEmail, setPhoneOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ phoneOrEmail?: string; password?: string }>({})

  const validate = (): boolean => {
    const newErrors: { phoneOrEmail?: string; password?: string } = {}

    if (!phoneOrEmail.trim()) {
      newErrors.phoneOrEmail = t('login.errors.phoneOrEmail')
    }
    if (!password) {
      newErrors.password = t('login.errors.password')
    } else if (password.length < 8) {
      newErrors.password = t('login.errors.passwordTooShort')
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join('\n')
      Alert.alert(t('common.error'), errorMessages, [{ text: t('common.ok') }])
      return false
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      await login(phoneOrEmail, password)
      // Login successful - navigation handled by AppNavigator
    } catch (err: any) {
      console.error('Login error:', err)
      let errorMessage = err?.message || error || t('login.errors.loginFailed')

      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
        errorMessage = t('login.errors.networkError')
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = t('login.errors.invalidCredentials')
      }

      Alert.alert(t('common.error'), errorMessage, [{ text: t('common.ok') }])
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView
  contentContainerStyle={styles.scrollContent}
  keyboardShouldPersistTaps="handled"
>
  {/* Language */}
  {/* <View style={styles.language}>
    <LanguageSwitcher />
  </View> */}

  {/* Logo */}
  <View style={styles.logoBlock}>
    <Text style={styles.logo}>AgronetX</Text>
    <Text style={styles.pageTitle}>{t('login.submit')}</Text>
  </View>

  {/* Description */}
  <Text style={styles.description}>
    {t('login.welcome')}
  </Text>

  {/* Inputs */}
  <Input
    value={phoneOrEmail}
    label=""
    onChangeText={setPhoneOrEmail}
    placeholder={t('login.phoneOrEmail')}
    error={errors.phoneOrEmail}
    autoCapitalize="none"
  />

  <Input
    value={password}
    label=""
    onChangeText={setPassword}
    placeholder={t('login.password')}
    showPasswordToggle
    error={errors.password}
  />

  {/* Forgot password */}
  <TouchableOpacity
    style={styles.forgotPassword}
    onPress={() => (navigation as any).navigate('ForgotPassword')}
  >
    <Text style={styles.forgotPasswordText}>
      {t('login.forgotPassword')}
    </Text>
  </TouchableOpacity>

  {/* Button */}
  <Button
    title={t('login.submit')}
    onPress={handleSubmit}
    loading={loading}
    disabled={loading || !phoneOrEmail.trim() || !password.trim()}
  />

  {/* Register */}
  <View style={styles.registerBlock}>
    <Text style={styles.registerText}>{t('login.noAccount')}</Text>
    <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
      <Text style={styles.registerLink}>{t('login.register')}</Text>
    </TouchableOpacity>
  </View>
</ScrollView>

    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  language: {
    alignItems: 'flex-end',
    marginTop: 16,
  },

  /* ---------- LOGO ---------- */
  logoBlock: {
    alignItems: 'center',
    marginTop: "40%",
    marginBottom: 40,
  },

  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.darkGray,
    marginBottom: 12,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.darkGray,
  },

  /* ---------- DESCRIPTION ---------- */
  description: {
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 16,
    color: colors.textSecondary,
  },

  /* ---------- INPUT HELP ---------- */
  forgotPassword: {
    alignSelf: 'center',
    marginVertical: 20,
  },

  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },

  /* ---------- REGISTER ---------- */
  registerBlock: {
    alignItems: 'center',
    marginTop: 32,
  },

  registerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },

  registerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
})




