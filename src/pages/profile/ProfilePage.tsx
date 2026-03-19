import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { AppHeader } from '../../components/AppHeader'
import { Select } from '../../components/Select'
import Icon from '../../components/Icon'
import { Button } from '../../components/Button'
import * as profileAPI from '../../lib/api/profile.api'

import { useRegions, useVillagesByRegion } from '../../hooks/useProfileQueries'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()

  const [identityExpanded, setIdentityExpanded] = useState(false)
  const [organizationExpanded, setOrganizationExpanded] = useState(false)
  const [locationExpanded, setLocationExpanded] = useState(false)

  const [name, setName] = useState('')
  const [userType, setUserType] = useState('')
  const [primaryPhone, setPrimaryPhone] = useState('')
  const [secondaryPhone, setSecondaryPhone] = useState<string | null>(null)
  const [region, setRegion] = useState('')
  const [village, setVillage] = useState('')
  const [regionChangedManually, setRegionChangedManually] = React.useState(false)
  const [updating, setUpdating] = useState(false)

  // Regions via React Query (cached, staleTime: Infinity)
  const { data: regions = [], isLoading: loadingRegions } = useRegions()
  // Villages via React Query (keyed by region, cached)
  const { data: villages = [], isLoading: loadingVillages } = useVillagesByRegion(
    regionChangedManually || !!user?.region_id ? region : undefined,
  )

  // Initialize form fields from user exactly once (avoids overwriting in-progress edits
  // if `user` reference changes after a successful save via updateUser).
  const formInitializedRef = useRef(false)
  useEffect(() => {
    if (!user || formInitializedRef.current) return
    formInitializedRef.current = true
    setName(user.full_name || '')
    setUserType(user.user_type || '')
    if (user.phone) setPrimaryPhone(user.phone)
    if (user.phones && Array.isArray(user.phones)) {
      const others = user.phones.filter(p => p !== user.phone)
      if (others.length > 0) setSecondaryPhone(others[0])
    }
    const userRegionId = user.region?.id || user.region_id
    if (userRegionId) {
      setRegion(userRegionId)
      const userVillageId = user.village?.id || user.village_id
      if (userVillageId) setVillage(userVillageId)
    }
  }, [user])

  // Clear village when user manually changes region
  useEffect(() => {
    if (regionChangedManually) setVillage('')
  }, [region, regionChangedManually])

  const handleRegionChange = (value: string) => {
    setRegionChangedManually(true)
    setRegion(value)
  }


  const handleAddSecondaryPhone = () => {
    // Show the secondary phone input field
    setSecondaryPhone('')
  }

  const handleRemoveSecondaryPhone = () => {
    // Hide the secondary phone input field
    setSecondaryPhone(null)
  }

  const handleSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('profile.userNotFound'))
      return
    }

    try {
      setUpdating(true)

      if (!name || name.trim() === '') {
        Alert.alert(t('common.error'), t('profile.nameRequired'))
        setUpdating(false)
        return
      }

      if (!primaryPhone || primaryPhone.trim() === '') {
        Alert.alert(t('common.error'), t('profile.phoneRequired'))
        setUpdating(false)
        return
      }

      const phones = [primaryPhone.trim()]
      if (secondaryPhone && secondaryPhone.trim() !== '') {
        phones.push(secondaryPhone.trim())
      }

      const updateData: profileAPI.UpdateUserRequest = {
        full_name: name.trim(),
        phones,
      }

      if (region) updateData.region_id = region
      if (village) updateData.village_id = village

      const response = await profileAPI.updateUserAPI(user.id, updateData)

      if (response.user) {
        updateUser(response.user)
      } else {
        updateUser({
          full_name: name.trim(),
          phone: primaryPhone.trim(),
          phones,
          region_id: region || undefined,
          village_id: village || undefined,
        })
      }

      Alert.alert(t('common.success'), t('profile.updateSuccess'), [{ text: t('common.ok') }])
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || t('profile.updateError')
      Alert.alert(t('common.error'), errorMessage, [{ text: t('common.ok') }])
    } finally {
      setUpdating(false)
    }
  }

  const USER_TYPE_OPTIONS = [
    { value: 'farmer', label: t('profile.accountType.farmer') },
    { value: 'organization', label: t('profile.accountType.organization') },
  ]

  // Convert regions and villages to select options
  const regionOptions = regions.map(r => ({
    value: r.id,
    label: r.name_hy || r.name || r.name_en || ''
  }))

  const villageOptions = villages.map(v => ({
    value: v.id,
    label: v.name_hy || v.name || v.name_en || ''
  }))

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <AppHeader showBack />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Title */}
          <Text style={styles.pageTitle}>{t('profile.personalData')}</Text>

          {/* User Profile Section */}
          <View style={styles.userProfileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <Text style={styles.userName}>{name}</Text>
          </View>

          {/* Status Section */}
          <View style={styles.statusSection}>
            <View style={styles.statusLeft}>
              <Text style={styles.statusLabel}>{t('profile.status')}</Text>
              <Text style={styles.statusValue}>{t('profile.verified')}</Text>
            </View>
            <View style={styles.statusCheck}>
              <Icon name="check" size={20} color={colors.white} />
            </View>
          </View>

          {/* Identity Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setIdentityExpanded(!identityExpanded)}
            >
              <Text style={styles.sectionTitle}>{t('profile.identity')}</Text>
              <Icon
                name={identityExpanded ? 'keyboard-arrow-down' : 'chevron-right'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {identityExpanded && (
              <View style={styles.sectionContent}>
                <View style={styles.fieldContainer}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('profile.nameSurname')}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Select
                    disabled={true}
                    value={userType}
                    onValueChange={setUserType}
                    options={USER_TYPE_OPTIONS}
                    placeholder={t('profile.userType')}
                    label=""  
                  />
                </View>
              </View>
            )}
          </View>

          {/* Organization Data Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setOrganizationExpanded(!organizationExpanded)}
            >
              <Text style={styles.sectionTitle}>{t('profile.contactDetails')}</Text>
              <Icon
                name={organizationExpanded ? 'keyboard-arrow-down' : 'chevron-right'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {organizationExpanded && (
              <View style={styles.sectionContent}>
                {/* Primary Phone */}
                <View style={styles.fieldContainer}>
                  <TextInput
                    style={styles.input}
                    value={primaryPhone}
                    onChangeText={setPrimaryPhone}
                    placeholder={t('profile.primaryNumber')}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Secondary Phone */}
                {secondaryPhone !== null ? (
                  <View style={styles.fieldContainer}>
                    <View style={styles.fieldWithRemove}>
                      <View style={styles.fieldLeftSection}>
                        <TextInput
                          style={styles.input}
                          value={secondaryPhone}
                          onChangeText={setSecondaryPhone}
                          placeholder={t('profile.secondaryNumber')}
                          keyboardType="phone-pad"
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={handleRemoveSecondaryPhone}
                      >
                        <Icon name="close" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddSecondaryPhone}
                  >
                    <Text style={styles.addButtonText}>+ {t('profile.addSecond')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setLocationExpanded(!locationExpanded)}
            >
              <Text style={styles.sectionTitle}>{t('profile.location')}</Text>
              <Icon
                name={locationExpanded ? 'keyboard-arrow-down' : 'chevron-right'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {locationExpanded && (
              <View style={styles.sectionContent}>
                <View style={styles.fieldContainer}>
                  {loadingRegions ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.buttonPrimary} />
                      <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                  ) : (
                    <Select
                      value={region}
                      onValueChange={handleRegionChange}
                      options={regionOptions}
                      placeholder={t('addAnnouncement.region')}
                      label=""
                    />
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  {loadingVillages ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.buttonPrimary} />
                      <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                  ) : (
                    <Select
                      value={village}
                      onValueChange={setVillage}
                      options={villageOptions}
                      placeholder={t('addAnnouncement.village')}
                      disabled={!region || villageOptions.length === 0}
                      label=""
                    />
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <Button
              onPress={handleSaveProfile}
              title={t('profile.saveChanges')}
              disabled={updating}
              loading={updating}
            />
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
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  statusSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusLeft: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  sectionContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 30,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  addButton: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 14,
    color: colors.buttonPrimary,
    fontWeight: '500',
  },
  fieldWithRemove: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fieldLeftSection: {
    flex: 1,
  },
  removeButton: {
    marginTop: 28,
    padding: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveButtonContainer: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
})
