import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { AppHeader } from '../../components/AppHeader'
import Icon from '../../components/Icon'
import { changePasswordAPI } from '../../lib/api/profile.api'

export function SettingsPage() {
  const navigation = useNavigation()
  const { t } = useTranslation()

  const [expanded, setExpanded] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!currentPassword.trim()) {
      Alert.alert(t('common.error'), t('profile.currentPassword'))
      return
    }
    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('profile.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('profile.passwordMismatch'))
      return
    }

    try {
      setLoading(true)
      await changePasswordAPI({
        current_password: currentPassword.trim(),
        new_password: newPassword,
      })
      Alert.alert(t('common.success'), t('profile.changePasswordSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => {
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setExpanded(false)
            navigation.goBack()
          },
        },
      ])
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || error?.message || t('profile.changePasswordError')
      Alert.alert(t('common.error'), msg)
    } finally {
      setLoading(false)
    }
  }, [currentPassword, newPassword, confirmPassword, navigation, t])

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader showBack />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>{t('settings.title')}</Text>

          {/* Change Password accordion */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpanded(v => !v)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIcon}>
                  <Icon name="lock" size={18} color={colors.buttonPrimary} />
                </View>
                <Text style={styles.sectionTitle}>{t('profile.changePassword')}</Text>
              </View>
              <Icon
                name={expanded ? 'keyboard-arrow-down' : 'chevron-right'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {expanded && (
              <View style={styles.sectionContent}>
                {/* Current password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('profile.currentPassword')}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder={t('profile.currentPassword')}
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showCurrent}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowCurrent(v => !v)}
                    >
                      <Icon
                        name={showCurrent ? 'visibility-off' : 'visibility'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('profile.newPassword')}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder={t('profile.newPassword')}
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showNew}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowNew(v => !v)}
                    >
                      <Icon
                        name={showNew ? 'visibility-off' : 'visibility'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm new password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t('profile.confirmNewPassword')}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={t('profile.confirmNewPassword')}
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowConfirm(v => !v)}
                    >
                      <Icon
                        name={showConfirm ? 'visibility-off' : 'visibility'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.submitBtnText}>{t('profile.changePassword')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.buttonPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 30,
    backgroundColor: colors.white,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
})
