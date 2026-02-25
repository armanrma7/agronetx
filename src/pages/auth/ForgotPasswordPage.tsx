import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors } from '../../theme/colors'
import * as authAPI from '../../lib/api/auth.api'

export function ForgotPasswordPage() {
  const navigation = useNavigation()
  const { t } = useTranslation()

  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ phone?: string }>({})

  const validate = (): boolean => {
    const newErrors: { phone?: string } = {}

    if (!phone.trim()) {
      newErrors.phone = t('forgotPassword.errors.phoneOrEmail')
    } else if (!/^\+?[0-9]{10,}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = t('forgotPassword.errors.invalidPhone')
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      Alert.alert(t('common.error'), Object.values(newErrors).join('\n'), [{ text: t('common.ok') }])
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      setLoading(true)
      await authAPI.forgotPasswordAPI({ phone: phone.trim() })

      Alert.alert(
        t('common.success'),
        t('forgotPassword.codeSent'),
        [{
          text: t('common.ok'),
          onPress: () => (navigation as any).navigate('Verification', { phone: phone.trim() }),
        }]
      )
    } catch (err: any) {
      console.error('Forgot password error:', err)
      const errorMessage =
        err?.response?.data?.message || err?.message || t('forgotPassword.errors.recoveryFailed')
      Alert.alert(t('common.error'), errorMessage, [{ text: t('common.ok') }])
    } finally {
      setLoading(false)
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
          label={t('forgotPassword.phoneLabel')}
          value={phone}
          required
          onChangeText={setPhone}
          placeholder={t('forgotPassword.phonePlaceholder')}
          keyboardType="phone-pad"
          error={errors.phone}
          autoCapitalize="none"
        />

        <View style={styles.buttonWrapper}>
          <Button
            onPress={handleSubmit}
            title={t('forgotPassword.submit')}
            disabled={loading || !phone.trim()}
            loading={loading}
          />
        </View>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
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
  buttonWrapper: {
    marginTop: 24,
    width: '100%',
  },
  backLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
  backLinkText: {
    fontSize: 14,
    color: colors.primary,
  },
})
