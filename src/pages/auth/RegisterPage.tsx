import React, { useEffect, useState } from 'react'
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
import { useNavigation, useRoute } from '@react-navigation/native'

import { useAuth } from '../../context/AuthContext'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/Checkbox'
import { useTranslation } from 'react-i18next'
import { RegisterFormData, ContactMethod, AccountType } from '../../types'
import { colors } from '../../theme/colors'

/* ---------- OPTIONS ---------- */

const accountTypeOptions = [
  { value: 'farmer', label: 'Ֆերմեր' },
  { value: 'company', label: 'Կազմակերպություն' },
]

// Removed contact method options - phone number only

/* ---------- COMPONENT ---------- */

export function RegisterPage() {
  const navigation = useNavigation()
  const route = useRoute()
  const { register, loading, error } = useAuth()
  const { t } = useTranslation()

  const [formData, setFormData] = useState<RegisterFormData>({
    accountType: '',
    fullname: '',
    verificationType: 'sms',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  })

  const [errors, setErrors] =
    useState<Partial<Record<keyof RegisterFormData, string>>>({})

  // Always show phone input (no selection needed)
  const hasVerificationType = true

  /* ---------- ROUTE PARAM ---------- */

  useEffect(() => {
    const params = route.params as { accountType?: AccountType } | undefined
    if (params?.accountType) {
      setFormData(prev => ({ ...prev, accountType: params.accountType || '' }))
    }
  }, [route.params])

  /* ---------- VALIDATION ---------- */

  const validate = () => {
    const e: Partial<Record<keyof RegisterFormData, string>> = {}

    if (!formData.accountType) e.accountType = 'Պարտադիր է'
    if (!formData.fullname.trim()) e.fullname = 'Անուն Ազգանուն դաշտը պարտադիր է'

    // Validate phone number
    if (!formData.emailOrPhone.trim()) {
      e.emailOrPhone = 'Հեռախոսահամարը պարտադիր է'
    } else if (!/^\+?[0-9]{10,}$/.test(formData.emailOrPhone.replace(/\s/g, ''))) {
      e.emailOrPhone = 'Սխալ հեռախոսահամար'
    }

    if (!formData.password) e.password = 'Գաղտնաբառը պարտադիր է'
    if (formData.password && formData.password.length < 6) e.password = 'Առնվազն 6 սիմվոլ'
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = 'Գաղտնաբառերը չեն համընկնում'

    if (!formData.agreeToTerms) e.agreeToTerms = 'Համաձայնվեք պայմաններին'

    setErrors(e)
    
    // Show alert if there are validation errors
    if (Object.keys(e).length > 0) {
      const errorMessages = Object.values(e).join('\n')
      Alert.alert('Սխալ', errorMessages, [{ text: 'Լավ' }])
      return false
    }
    
    return true
  }

  /* ---------- SUBMIT ---------- */

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      const phone = formData.emailOrPhone
      console.info('accountType', formData.accountType)

      await register(phone, formData.password, formData.fullname, formData.accountType as AccountType)
      ;(navigation as any).navigate('Verification', { phone: phone })
    } catch (err: any) {
      const errorMessage = err?.message || error || 'Գրանցման ժամանակ սխալ է տեղի ունեցել'
      console.error('Registration error:', err)
      
      // Check if it's an OTP sending error (already handled above) or registration error
      if (!err?.message?.includes('sendOTP')) {
        Alert.alert(
          'Գրանցման սխալ',
          errorMessage,
          [{ text: 'Լավ' }]
        )
      }
    }
  }

  const contactLabel = t('register.phoneNumber')
  const contactPlaceholder = t('register.phonePlaceholder')

  /* ---------- RENDER ---------- */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* LOGO */}
        <View style={styles.logoBlock}>
          <Text style={styles.logo}>AgronetX</Text>
          <Text style={styles.title}>{t('register.title')}</Text>
        </View>

        {/* ACCOUNT TYPE */}
        <Select
          label={t('register.accountType')}
          required
          value={formData.accountType}
          options={accountTypeOptions}
          onValueChange={v =>
            setFormData({ ...formData, accountType: v as AccountType })
          }
          error={errors.accountType}
        />

        {/* FULL NAME */}
        <Input
          label={t('register.nameSurname')}
          placeholder={t('register.namePlaceholder')}
          required
          value={formData.fullname}
          onChangeText={value => {
            setFormData({
              ...formData,
              fullname: value,
            })
          }}
          error={errors.fullname}
        />

        {/* PHONE NUMBER */}
        <Input
          label={contactLabel}
          placeholder={contactPlaceholder}
          required
          value={formData.emailOrPhone}
          keyboardType="phone-pad"
          onChangeText={value =>
            setFormData({ ...formData, emailOrPhone: value })
          }
          error={errors.emailOrPhone}
        />
        
        {/* PHONE NOTE */}
        <Text style={styles.phoneNote}>
          {t('register.phoneNote')}
        </Text>

        {/* PASSWORD */}
        <Input
          required
          label={t('register.password')}
          placeholder={t('register.namePlaceholder')}
          secureTextEntry
          showPasswordToggle
          value={formData.password}
          onChangeText={value =>
            setFormData({ ...formData, password: value })
          }
          error={errors.password}
        />

        <Input
          required 
          label={t('register.confirmPassword')}
          placeholder={t('register.namePlaceholder')}
          secureTextEntry
          showPasswordToggle
          value={formData.confirmPassword}
          onChangeText={value => {
            setFormData({ ...formData, confirmPassword: value })
            // Show error if passwords don't match
            if (value && formData.password && value !== formData.password) {
              setErrors({ ...errors, confirmPassword: t('register.passwordMismatch') })
            } else {
              const { confirmPassword, ...restErrors } = errors
              setErrors(restErrors)
            }
          }}
          error={errors.confirmPassword}
        />

        <Checkbox
          label={t('register.agreeTerms')}
          checked={formData.agreeToTerms}
          onToggle={checked =>
            setFormData({ ...formData, agreeToTerms: checked })
          }
          onLabelPress={() => (navigation as any).navigate('Terms')}
          error={errors.agreeToTerms}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button 
          title="Գրանցվել" 
          onPress={handleSubmit} 
          loading={loading}
          disabled={
            loading ||
            !formData.accountType ||
            !formData.fullname.trim() ||
            !formData.emailOrPhone.trim() ||
            !formData.password ||
            !formData.confirmPassword ||
            !formData.agreeToTerms
          }
        />

        {/* Already have account */}
        <View style={styles.loginBlock}>
          <Text style={styles.loginText}>{t('register.haveAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
            <Text style={styles.loginLink}>{t('register.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: '20%',
    paddingBottom: 40,
    gap: 24,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.darkGray,
  },
  title: {
    fontSize: 34,
    fontWeight: '600',
    marginTop: 6,
    color: colors.darkGray,
  },

  phoneNote: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: -16,
    marginBottom: 8,
    lineHeight: 16,
  },

  error: {
    color: colors.errorDark,
    textAlign: 'center',
    marginBottom: 10,
  },

  loginBlock: {
    alignItems: 'center',
    marginTop: 10,
  },

  loginText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },

  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
})
