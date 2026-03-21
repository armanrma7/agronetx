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
  ActivityIndicator,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'

import { useAuth } from '../../context/AuthContext'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/Checkbox'
import { useTranslation } from 'react-i18next'
import { RegisterFormData, AccountType } from '../../types'
import { colors } from '../../theme/colors'
import { useRegions, useVillagesByRegion } from '../../hooks/useProfileQueries'

/* ---------- COMPONENT ---------- */

export function RegisterPage() {
  const navigation = useNavigation()
  const route = useRoute()
  const { register, loading, error } = useAuth()
  const { t } = useTranslation()

  const accountTypeOptions = [
    { value: 'farmer', label: t('register.accountTypeFarmer') },
    { value: 'company', label: t('register.accountTypeOrganization') },
  ]

  const [formData, setFormData] = useState<RegisterFormData>({
    accountType: '',
    fullname: '',
    verificationType: 'sms',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  })

  type RegisterFieldErrors = Partial<Record<keyof RegisterFormData, string>> & {
    region?: string
    village?: string
  }
  const [errors, setErrors] = useState<RegisterFieldErrors>({})

  const [region, setRegion] = useState('')
  const [village, setVillage] = useState('')
  const [regionChangedManually, setRegionChangedManually] = useState(false)

  const { data: regions = [], isLoading: loadingRegions } = useRegions()
  const { data: villages = [], isLoading: loadingVillages } = useVillagesByRegion(
    region || undefined,
  )

  useEffect(() => {
    if (regionChangedManually) setVillage('')
  }, [region, regionChangedManually])

  const handleRegionChange = (value: string) => {
    setRegionChangedManually(true)
    setRegion(value)
  }

  const regionOptions = regions.map(r => ({
    value: r.id,
    label: r.name_hy || r.name || r.name_en || '',
  }))

  const villageOptions = villages.map(v => ({
    value: v.id,
    label: v.name_hy || v.name || v.name_en || '',
  }))

  /* ---------- ROUTE PARAM ---------- */

  useEffect(() => {
    const params = route.params as { accountType?: AccountType } | undefined
    if (params?.accountType) {
      setFormData(prev => ({ ...prev, accountType: params.accountType || '' }))
    }
  }, [route.params])

  /* ---------- VALIDATION ---------- */

  const validate = () => {
    const e: RegisterFieldErrors = {}

    if (!formData.accountType) e.accountType = t('register.errors.required')
    if (!formData.fullname.trim()) e.fullname = t('register.errors.fullname')

    if (!region.trim()) e.region = t('register.errors.regionRequired')
    if (region.trim() && !loadingVillages && villages.length > 0 && !village.trim()) {
      e.village = t('register.errors.villageRequired')
    }

    if (!formData.emailOrPhone.trim()) {
      e.emailOrPhone = t('register.errors.phoneRequired')
    } else if (!/^[0-9]{8}$/.test(formData.emailOrPhone.replace(/\s/g, ''))) {
      e.emailOrPhone = t('register.errors.invalidPhone')
    }

    if (!formData.password) e.password = t('register.errors.password')
    if (formData.password && formData.password.length < 6) e.password = t('register.errors.passwordMin')
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = t('register.errors.passwordMatch')

    if (!formData.agreeToTerms) e.agreeToTerms = t('register.errors.agreeTerms')

    setErrors(e)

    if (Object.keys(e).length > 0) {
      const errorMessages = Object.values(e).join('\n')
      Alert.alert(t('common.error'), errorMessages, [{ text: t('common.ok') }])
      return false
    }

    return true
  }

  /* ---------- SUBMIT ---------- */

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      const phone = `+374${formData.emailOrPhone.trim()}`
      console.info('accountType', formData.accountType)

      await register(
        phone,
        formData.password,
        formData.fullname,
        formData.accountType as AccountType,
        region.trim() || undefined,
        village.trim() || undefined,
      )
      ;(navigation as any).navigate('Verification', { phone: phone })
    } catch (err: any) {
      const errorMessage = err?.message || error || t('register.errors.registerFailed')
      console.error('Registration error:', err)

      if (!err?.message?.includes('sendOTP')) {
        Alert.alert(
          t('register.errors.registerError'),
          errorMessage,
          [{ text: t('common.ok') }]
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
          placeholder={t('common.select')}
          required
          value={formData.accountType || ''}
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

         <Input
          label={contactLabel}
          placeholder={contactPlaceholder}
          required
          value={formData.emailOrPhone}
          keyboardType="phone-pad"
          onChangeText={value =>
            setFormData({ ...formData, emailOrPhone: value.replace(/\D/g, '').slice(0, 8) })
          }
          error={errors.emailOrPhone}
          prefix="+374"
          maxLength={8}
        />
        
        {/* REGION — label + row; loading matches Profile (inside select slot) */}
        <View style={styles.selectFieldSlot}>
          <Text style={styles.selectFieldLabel}>
            {t('addAnnouncement.region')}
            <Text style={styles.selectFieldRequired}> *</Text>
          </Text>
          {loadingRegions ? (
            <View style={styles.selectLoadingShell}>
              <ActivityIndicator size="small" color={colors.buttonPrimary} />
              <Text style={styles.selectLoadingText}>{t('common.loading')}</Text>
            </View>
          ) : (
            <Select
              label=""
              value={region}
              onValueChange={handleRegionChange}
              options={regionOptions}
              placeholder={t('addAnnouncement.region')}
              error={errors.region}
            />
          )}
        </View>

        {/* VILLAGE — same slot pattern; loading inside row when fetching villages */}
        <View style={styles.selectFieldSlot}>
          <Text style={styles.selectFieldLabel}>
            {t('addAnnouncement.village')}
            <Text style={styles.selectFieldRequired}> *</Text>
          </Text>
          {region && loadingVillages ? (
            <View style={styles.selectLoadingShell}>
              <ActivityIndicator size="small" color={colors.buttonPrimary} />
              <Text style={styles.selectLoadingText}>{t('common.loading')}</Text>
            </View>
          ) : (
            <Select
              label=""
              value={village}
              onValueChange={setVillage}
              options={villageOptions}
              placeholder={t('addAnnouncement.village')}
              disabled={
                loadingRegions ||
                !region ||
                villageOptions.length === 0
              }
              error={errors.village}
            />
          )}
        </View>
       
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
          title={t('register.submit')}
          onPress={handleSubmit} 
          loading={loading}
          disabled={
            loading ||
            loadingRegions ||
            !formData.accountType ||
            !formData.fullname.trim() ||
            !region.trim() ||
            (region && loadingVillages) ||
            (villageOptions.length > 0 && !village.trim()) ||
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

  /** Same slot + loading shell as Profile location fields */
  selectFieldSlot: {
    width: '100%',
  },
  selectFieldLabel: {
    fontSize: 14,
    color: colors.textTile,
    marginBottom: 7,
  },
  selectFieldRequired: {
    color: colors.error,
  },
  selectLoadingShell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
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
