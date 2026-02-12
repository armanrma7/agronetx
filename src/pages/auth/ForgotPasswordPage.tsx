import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors } from '../../theme/colors'
import { DEV_CONFIG } from '../../config/dev.config'
import * as authAPI from '../../lib/api/auth.api'

export function ForgotPasswordPage() {
  const navigation = useNavigation()
  const { t } = useTranslation()
  const { sendOTP, loading, error } = useAuth()
  const [phoneOrEmail, setPhoneOrEmail] = useState('')
  const [errors, setErrors] = useState<{ phoneOrEmail?: string }>({})

  const validate = (): boolean => {
    const newErrors: { phoneOrEmail?: string } = {}

    if (!phoneOrEmail.trim()) {
      newErrors.phoneOrEmail = t('forgotPassword.errors.phoneOrEmail')
    } else {
      const isEmail = phoneOrEmail?.includes('@')
      if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phoneOrEmail)) {
        newErrors.phoneOrEmail = t('forgotPassword.errors.invalidEmail')
      } else if (!isEmail && !/^\+?[0-9]{10,}$/.test(phoneOrEmail.replace(/\s/g, ''))) {
        newErrors.phoneOrEmail = t('forgotPassword.errors.invalidPhone')
      }
    }

    setErrors(newErrors)
    
    // Show alert if there are validation errors
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join('\n')
      Alert.alert('Սխալ', errorMessages, [{ text: 'Լավ' }])
      return false
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      // MOCK MODE
      if (DEV_CONFIG.MOCK_MODE) {
        await new Promise<void>(resolve => setTimeout(resolve, DEV_CONFIG.MOCK_DELAY))
        console.log('MOCK: Password reset OTP sent to', phoneOrEmail)
        Alert.alert(
          'Հաջողություն',
          'Վերահաստատման կոդը ուղարկվել է',
          [{ text: 'Լավ', onPress: () => (navigation as any).navigate('Verification', { phone: phoneOrEmail }) }]
        )
        return
      }

      // REAL MODE - Use custom API
      await authAPI.forgotPasswordAPI({ phoneOrEmail })
      
      // Show success alert and navigate
      Alert.alert(
        'Հաջողություն',
        'Վերահաստատման կոդը ուղարկվել է',
        [{ text: 'Լավ', onPress: () => (navigation as any).navigate('Verification', { phone: phoneOrEmail }) }]
      )
    } catch (err: any) {
      console.error('Forgot password error:', err)
      const errorMessage = err?.message || error || 'Վերականգնման ժամանակ սխալ է տեղի ունեցել'
      Alert.alert(
        'Սխալ',
        errorMessage,
        [{ text: 'Լավ' }]
      )
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
        <View style={styles.header}>
          <Text style={styles.title}>{t('appName')}</Text>
          <Text style={styles.subtitle}>{t('forgotPassword.title')}</Text>
        </View>

        <Text style={styles.instructions}>{t('forgotPassword.description')}</Text>

        <Input
          label="Email or Phone"
          value={phoneOrEmail}
          required
          onChangeText={setPhoneOrEmail}
          placeholder={t('forgotPassword.phoneOrEmail')}
          error={errors.phoneOrEmail}
          note={
            phoneOrEmail && !phoneOrEmail.includes('@')
              ? t('forgotPassword.phoneNote')
              : undefined
          }
          // keyboardType={phoneOrEmail?.includes('@') ? 'email-address' : 'phone-pad'}
          autoCapitalize="none"
        />

        <View style={styles.buttonWrapper}>
          <Button
            onPress={handleSubmit}
            title={t('forgotPassword.submit')}
            disabled={loading || !phoneOrEmail.trim()}
            loading={loading}
          />
        </View>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backLinkText}>{t('forgotPassword.backToLogin')}</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingTop: '20%',
    flexGrow: 1,
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 17,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    marginBottom: '10%',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 28,
    lineHeight: 24,
  },
  backLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
  backLinkText: {
    fontSize: 14,
    color: colors.primary,
  },
  buttonWrapper: {
    marginTop: 24,
    width: '100%',
  },
})

