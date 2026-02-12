import React, { useState, useEffect } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { AppHeader } from '../../components/AppHeader'
import { Select } from '../../components/Select'
import Icon from '../../components/Icon'
import { Button } from '../../components/Button'
import * as profileAPI from '../../lib/api/profile.api'

import { useAuthStore } from '../../store/auth.store'

export function ProfilePage() {
  const { user } = useAuth()
  const updateUser = useAuthStore(state => state.updateUser)
  console.log('User data:', user)
  
  const [identityExpanded, setIdentityExpanded] = useState(false)
  const [organizationExpanded, setOrganizationExpanded] = useState(false)
  const [locationExpanded, setLocationExpanded] = useState(false)

  const [name, setName] = useState('')
  const [userType, setUserType] = useState('')
  const [primaryPhone, setPrimaryPhone] = useState('')
  const [secondaryPhone, setSecondaryPhone] = useState<string | null>(null)
  const [region, setRegion] = useState('')
  const [village, setVillage] = useState('')

  // Regions and Villages state
  const [regions, setRegions] = useState<profileAPI.Region[]>([])
  const [villages, setVillages] = useState<profileAPI.Village[]>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [loadingVillages, setLoadingVillages] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      console.log('Loading user data:', user)
      setName(user.full_name || '')
      setUserType(user.user_type || '')
      
      // Set primary phone
      if (user.phone) {
        setPrimaryPhone(user.phone)
      }
      
      // Load secondary phone if it exists
      if (user.phones && Array.isArray(user.phones) && user.phones.length > 0) {
        console.log('User phones:', user.phones)
        // Filter out the primary phone from the phones array
        const otherPhones = user.phones.filter(p => p !== user.phone)
        if (otherPhones.length > 0) {
          setSecondaryPhone(otherPhones[0]) // Only take first additional phone
        }
      }

      // Load region - check both region object and region_id
      const userRegionId = user.region?.id || user.region_id
      if (userRegionId) {
        console.log('User has region:', userRegionId, user.region)
        setRegion(userRegionId)
        
        // Load village after region is set - check both village object and village_id
        const userVillageId = user.village?.id || user.village_id
        if (userVillageId) {
          console.log('User has village:', userVillageId, user.village)
          // Fetch villages for this region first, then set the village
          fetchVillages(userRegionId).then(() => {
            console.log('Setting village after fetch:', userVillageId)
            setVillage(userVillageId)
          })
        } else {
          // No village, just fetch the villages list for the region
          fetchVillages(userRegionId)
        }
      }
    }
  }, [user])

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions()
  }, [])

  // Track if this is a manual region change (not initial load)
  const [regionChangedManually, setRegionChangedManually] = React.useState(false)
  
  // Fetch villages when region changes manually
  useEffect(() => {
    if (region && regionChangedManually) {
      fetchVillages(region)
      setVillage('') // Clear village selection when region changes manually
    }
  }, [region, regionChangedManually])

  const fetchRegions = async () => {
    try {
      setLoadingRegions(true)
      const data = await profileAPI.getRegionsAPI()
      console.log('Regions loaded:', data)
      setRegions(data)
    } catch (error) {
      console.error('Error fetching regions:', error)
    } finally {
      setLoadingRegions(false)
    }
  }

  const fetchVillages = async (regionId: string): Promise<void> => {
    try {
      setLoadingVillages(true)
      const data = await profileAPI.getVillagesByRegionAPI(regionId)
      console.log('Villages loaded for region:', regionId, data)
      setVillages(data)
    } catch (error) {
      console.error('Error fetching villages:', error)
      setVillages([])
    } finally {
      setLoadingVillages(false)
    }
  }

  const handleRegionChange = (value: string) => {
    setRegionChangedManually(true)
    setRegion(value)
  }


  const handleSearchPress = () => {
    console.log('Search pressed')
  }

  const handleProfilePress = () => {
    console.log('Profile pressed')
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
      Alert.alert('Սխալ', 'Օգտագործողի ID-ն չի գտնվել')
      return
    }

    try {
      setUpdating(true)

      // Validate required fields
      if (!name || name.trim() === '') {
        Alert.alert('Սխալ', 'Անուն Ազգանուն դաշտը պարտադիր է')
        setUpdating(false)
        return
      }

      if (!primaryPhone || primaryPhone.trim() === '') {
        Alert.alert('Սխալ', 'Հիմնական հեռախոսահամարը պարտադիր է')
        setUpdating(false)
        return
      }

      // Prepare phones array
      const phones = [primaryPhone.trim()]
      if (secondaryPhone && secondaryPhone.trim() !== '') {
        phones.push(secondaryPhone.trim())
      }

      // Prepare update data
      const updateData: profileAPI.UpdateUserRequest = {
        full_name: name.trim(),
        phones: phones,
      }

      // Add region and village if selected
      if (region) {
        updateData.region_id = region
      }
      if (village) {
        updateData.village_id = village
      }

      console.log('Updating user with data:', updateData)
      const response = await profileAPI.updateUserAPI(user.id, updateData)
      console.log('User updated successfully:', response)

      // Update local state with returned data
      if (response.user) {
        console.log('Updating local user state with:', response.user)
        updateUser(response.user)
      } else {
        // If API doesn't return user, update with our data
        updateUser({
          full_name: name.trim(),
          phone: primaryPhone.trim(),
          phones: phones,
          region_id: region || undefined,
          village_id: village || undefined,
        })
      }

      Alert.alert(
        'Հաջողություն',
        'Անձնական տվյալները հաջողությամբ թարմացվել են',
        [{ text: 'Լավ' }]
      )
    } catch (error: any) {
      console.error('Error updating profile:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Թարմացման սխալ'
      Alert.alert('Սխալ', errorMessage, [{ text: 'Լավ' }])
    } finally {
      setUpdating(false)
    }
  }

  const USER_TYPE_OPTIONS = [
    { value: 'farmer', label: 'Ֆերմեր' },
    { value: 'organization', label: 'Կազմակերպություն' },
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
        <AppHeader
          showBack
          onSearchPress={handleSearchPress}
          onProfilePress={handleProfilePress}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Title */}
          <Text style={styles.pageTitle}>Անձնական տվյալներ</Text>

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
              <Text style={styles.statusLabel}>Կարգավիճակ</Text>
              <Text style={styles.statusValue}>Վավերացված</Text>
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
              <Text style={styles.sectionTitle}>Իմքմություն</Text>
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
                    placeholder="Անուն Ազգանուն"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Select
                    disabled={true}
                    value={userType}
                    onValueChange={setUserType}
                    options={USER_TYPE_OPTIONS}
                    placeholder="Օգտագործողի տեսակ"
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
              <Text style={styles.sectionTitle}>Կոնտակտային տվյալներ</Text>
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
                    placeholder="Հիմնական համար"
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
                          placeholder="2-րդ Համար"
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
                    <Text style={styles.addButtonText}>+ Ավելացնել 2-րդ համար</Text>
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
              <Text style={styles.sectionTitle}>Գտնվելու վայր</Text>
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
                      <Text style={styles.loadingText}>Բեռնվում է...</Text>
                    </View>
                  ) : (
                    <Select
                      value={region}
                      onValueChange={handleRegionChange}
                      options={regionOptions}
                      placeholder="Մարզ"
                      label=""
                    />
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  {loadingVillages ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.buttonPrimary} />
                      <Text style={styles.loadingText}>Բեռնվում է...</Text>
                    </View>
                  ) : (
                    <Select
                      value={village}
                      onValueChange={setVillage}
                      options={villageOptions}
                      placeholder={region ? "Գյուղ" : "Նախ ընտրեք մարզը"}
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
              title="Պահպանել փոփոխությունները"
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
