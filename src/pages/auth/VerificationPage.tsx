import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/Button'
import { colors } from '../../theme/colors'
import { DEV_CONFIG } from '../../config/dev.config'

export function VerificationPage() {
  const navigation = useNavigation()
  const route = useRoute()
  const { t } = useTranslation()
  const { verifyOTP, sendOTP, loading, error } = useAuth()
  const phone = (route.params as { phone?: string })?.phone || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(41)
  const [canResend, setCanResend] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [timer])

  const handleOtpChange = (index: number, value: string) => {
    // Handle paste (multiple characters)
    if (value.length > 1) {
      const chars = value.split('').filter((c) => /[0-9]/.test(c))
      if (chars.length === 0) return
      const newOtp = [...otp]
      let i = index
      for (const ch of chars) {
        if (i > 5) break
        newOtp[i] = ch
        i += 1
      }
      setOtp(newOtp)
      // focus the next empty or last input
      const nextIndex = i <= 5 ? i : 5
      inputRefs.current[nextIndex]?.focus()
      return
    }

    const newOtp = [...otp]
    const cleaned = value.replace(/[^0-9]/g, '')
    newOtp[index] = cleaned
    setOtp(newOtp)

    // If user typed a digit, move to next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus()
      return
    }

    // If user cleared this input (deleted), move focus to previous
    if (!cleaned && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      Alert.alert(
        'Սխալ',
        'Խնդրում ենք մուտքագրել 6 նիշանոց կոդը',
        [{ text: 'Լավ' }]
      )
      return
    }

    try {
      console.log('Verifying OTP for phone:', phone, 'code:', otpString)
      await verifyOTP(phone, otpString)
      console.log('OTP verified successfully! User is now logged in.')
      
      // Show success alert
      Alert.alert(
        'Հաջողություն',
        'Հաստատումը հաջողությամբ կատարվել է։',
        [{ 
          text: 'Լավ',
          onPress: () => {
            // Navigate to Home after successful verification
            ;(navigation as any).navigate('Home')
          }
        }]
      )
    } catch (err: any) {
      console.error('Verification error:', err)
      const errorMessage = err?.message || 'Հաստատման ժամանակ սխալ է տեղի ունեցել'
      console.error('Error message:', errorMessage)
      
      // Show error alert
      Alert.alert(
        'Հաստատման սխալ',
        errorMessage,
        [{ text: 'Լավ' }]
      )
      
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  const handleResend = async () => {
    if (resendLoading) return
    
    try {
      setResendLoading(true)
      
      // MOCK MODE
      if (DEV_CONFIG.MOCK_MODE) {
        await new Promise<void>(resolve => setTimeout(resolve, DEV_CONFIG.MOCK_DELAY))
        console.log('MOCK: OTP resent to', phone)
        Alert.alert(
          'Հաջողություն',
          'Կոդը վերաուղարկվել է',
          [{ text: 'Լավ' }]
        )
        setTimer(41)
        setCanResend(false)
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        setResendLoading(false)
        return
      }

      // REAL MODE
      console.log('Resending OTP to:', phone)
      await sendOTP(phone)
      console.log('OTP resent successfully')
      
      // Show success alert
      Alert.alert(
        'Հաջողություն',
        'Հաստատման կոդը վերաուղարկվել է ձեր հեռախոսահամարին',
        [{ text: 'Լավ' }]
      )
      
      setTimer(41)
      setCanResend(false)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      setResendLoading(false)
    } catch (err: any) {
      console.error('Resend error:', err)
      const errorMessage = err?.message || 'Կոդը վերաուղարկելիս սխալ է տեղի ունեցել'
      console.error('Error message:', errorMessage)
      
      setResendLoading(false)
      
      // Show error alert
      Alert.alert(
        'Սխալ',
        errorMessage,
        [{ text: 'Լավ' }]
      )
    }
  }

  const maskedPhone = phone ? phone.replace(/(\+374)(\d{2})(\d{2})(\d{2})/, '+374 ***** $3-$4') : ''

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.subtitle}>{t('verification.title')}</Text>
      </View>

      <Text style={styles.instructions}>{t('verification.instructions')}</Text>

      <Text style={styles.recipientInfo}>
        {t('verification.sentTo', { phone: maskedPhone })}
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            style={styles.otpInput}
            value={digit}
            onChangeText={(value) => handleOtpChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            keyboardType="numeric"
            maxLength={1}
            selectTextOnFocus
            autoFocus={index === 0}
          />
        ))}
      </View>

      <View style={styles.buttonWrapper}>
        <View style={styles.buttonShadow}>
          <Button
            onPress={handleVerify}
            title={t('verification.verify')}
            disabled={loading || otp.join('').length !== 6}
            loading={loading}
          />
        </View>
      </View>

      <View style={styles.resendSection}>
        {timer > 0 ? (
          <Text style={styles.timerText}>
            {t('verification.resendIn', { seconds: timer })}
          </Text>
        ) : (
          <View style={styles.resendLink}>
            <Text style={styles.resendText}>
              {t('verification.didntReceive')}{' '}
            </Text>     
            <TouchableOpacity 
              disabled={!canResend || resendLoading} 
              onPress={handleResend}
              style={[styles.resendButton, (!canResend || resendLoading) && styles.resendButtonDisabled]}
            >
              {resendLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.resendLinkText, !canResend && styles.resendTextDisabled]}>
                  {t('verification.resend')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: '20%',
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: colors.textInfo,
    lineHeight: 24,
    textAlign: 'center',
  },
  recipientInfo: {
    fontSize: 16,
    color: colors.textInfo,
    marginBottom: 32,
    marginTop: 32,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 45,
    textAlign: 'center',
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  resendSection: {
    marginTop: 26,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textInfo,
  },
  resendLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textTertiary,
  },
  resendButton: {
    paddingHorizontal: 4,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: colors.textTertiary,
  },
  buttonWrapper: {
    marginTop: 22,
    width: '85%',
    alignSelf: 'center',
  },
  buttonShadow: {
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'visible',
  },
})

