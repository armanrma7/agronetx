import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/colors'
import Icon from './Icon'
import * as profileAPI from '../lib/api/profile.api'

export interface Region {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_ru?: string
}

export interface Village {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_ru?: string
  region_id: string
}

interface RegionVillageSelectorProps {
  selectedRegions: string[]
  selectedVillages: string[]
  onRegionsChange: (regionIds: string[]) => void
  onVillagesChange: (villageIds: string[]) => void
  currentLang?: 'hy' | 'en' | 'ru'
}

export function RegionVillageSelector({
  selectedRegions,
  selectedVillages,
  onRegionsChange,
  onVillagesChange,
  currentLang = 'hy',
}: RegionVillageSelectorProps) {
  const { t } = useTranslation()
  
  // State
  const [regions, setRegions] = useState<Region[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [loadingVillages, setLoadingVillages] = useState(false)
  
  // Bottom sheet visibility
  const [showRegionSheet, setShowRegionSheet] = useState(false)
  const [showVillageSheet, setShowVillageSheet] = useState(false)
  
  // Search queries
  const [regionSearchQuery, setRegionSearchQuery] = useState('')
  const [villageSearchQuery, setVillageSearchQuery] = useState('')
  
  // Temporary selections (for bottom sheets)
  const [tempSelectedRegions, setTempSelectedRegions] = useState<string[]>([])
  const [tempSelectedVillages, setTempSelectedVillages] = useState<string[]>([])
  
  // Cache for villages by region
  const [villagesCache, setVillagesCache] = useState<Record<string, Village[]>>({})
  const [lastFetchedRegionIds, setLastFetchedRegionIds] = useState<string>('')

  // Fetch regions function
  const fetchRegions = useCallback(async () => {
    try {
      setLoadingRegions(true)
      console.log('🔄 Fetching regions...')
      const data = await profileAPI.getRegionsAPI()
      console.log('📦 Regions API Response:', JSON.stringify(data, null, 2))
      
      // Handle different response structures
      let regionsData: Region[] = []
      if (Array.isArray(data)) {
        regionsData = data
      } else {
        const responseData = data as any
        if (responseData?.data && Array.isArray(responseData.data)) {
          regionsData = responseData.data
        } else if (responseData?.regions && Array.isArray(responseData.regions)) {
          regionsData = responseData.regions
        } else if (responseData?.results && Array.isArray(responseData.results)) {
          regionsData = responseData.results
        }
      }
      
      console.log('✅ Regions processed:', regionsData.length)
      if (regionsData.length > 0) {
        console.log('📍 First region:', JSON.stringify(regionsData[0], null, 2))
      }
      setRegions(regionsData)
    } catch (error: any) {
      setRegions([])
    } finally {
      setLoadingRegions(false)
    }
  }, [])

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions()
  }, [fetchRegions])

  // Fetch villages function - using ref to avoid dependency issues
  const fetchVillages = useCallback(async (regionIds: string[]) => {
    if (regionIds.length === 0) {
      setVillages([])
      return
    }

    const regionIdsKey = regionIds.sort().join(',')
    
    // Check cache using functional update to access current state
    setVillagesCache(prevCache => {
      if (prevCache[regionIdsKey] && prevCache[regionIdsKey].length > 0) {
        // Use cached data
        setVillages(prevCache[regionIdsKey])
        setLastFetchedRegionIds(regionIdsKey)
        return prevCache
      }
      
      // Fetch new data
      setLoadingVillages(true)
      
      // Try new API first (multiple regions)
      profileAPI.getVillagesByRegionsAPI(regionIds)
        .then((data) => {
          setVillages(data)
          setLastFetchedRegionIds(regionIdsKey)
          console.log('✅ Villages fetched for regions:', regionIdsKey, data.length)
          setLoadingVillages(false)
          setVillagesCache(prev => ({ ...prev, [regionIdsKey]: data }))
        })
        .catch((error) => {
          // Fallback to fetching by individual regions
          console.log('⚠️ Multi-region API failed, falling back to individual fetches')
          const promises = regionIds.map(async (regionId) => {
            try {
              return await profileAPI.getVillagesByRegionAPI(regionId)
            } catch (err) {
              console.error(`❌ Error fetching villages for region ${regionId}:`, err)
              return []
            }
          })
          
          Promise.all(promises)
            .then((results) => {
              const allVillages: Village[] = []
              results.forEach(villageList => {
                allVillages.push(...villageList)
              })
              
              setVillages(allVillages)
              setLastFetchedRegionIds(regionIdsKey)
              console.log('✅ Villages fetched (fallback):', allVillages.length)
              setLoadingVillages(false)
              setVillagesCache(prev => ({ ...prev, [regionIdsKey]: allVillages }))
            })
            .catch((err) => {
              console.error('❌ Error fetching villages:', err)
              setVillages([])
              setLoadingVillages(false)
            })
        })
      
      return prevCache
    })
  }, [])

  // Fetch villages when regions change
  useEffect(() => {
    if (selectedRegions.length > 0) {
      fetchVillages(selectedRegions)
    } else {
      setVillages([])
      setVillagesCache({})
    }
  }, [selectedRegions, fetchVillages])

  // Remove villages that no longer belong to selected regions
  useEffect(() => {
    // Only run when villages or selectedRegions change, not when selectedVillages changes
    // This prevents infinite loops
    
    // If no regions selected, clear villages
    if (selectedRegions.length === 0) {
      if (selectedVillages.length > 0) {
        onVillagesChange([])
      }
      return
    }

    // Only validate if we have villages loaded and selected villages
    if (villages.length === 0 || selectedVillages.length === 0) {
      return
    }

    // Check if any selected villages are invalid (don't belong to selected regions)
    const validVillageIds = villages
      .filter(v => selectedRegions.includes(v.region_id))
      .map(v => v.id)
    
    const invalidVillages = selectedVillages.filter(id => !validVillageIds.includes(id))
    
    // Only update if there are invalid villages
    if (invalidVillages.length > 0) {
      const validVillages = selectedVillages.filter(id => validVillageIds.includes(id))
      onVillagesChange(validVillages)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegions, villages])

  const getLocalizedName = (item: Region | Village): string => {
    if (currentLang === 'hy' && item.name_hy) return item.name_hy
    if (currentLang === 'ru' && item.name_ru) return item.name_ru
    if (currentLang === 'en' && item.name_en) return item.name_en
    return item.name
  }

  // Filtered regions for search
  const filteredRegions = useMemo(() => {
    if (!regionSearchQuery) return regions
    const query = regionSearchQuery.toLowerCase()
    return regions.filter(region => {
      const name = getLocalizedName(region).toLowerCase()
      return name.includes(query)
    })
  }, [regions, regionSearchQuery, currentLang])

  // Filtered villages for search
  const filteredVillages = useMemo(() => {
    if (!villageSearchQuery) return villages
    const query = villageSearchQuery.toLowerCase()
    return villages.filter(village => {
      const name = getLocalizedName(village).toLowerCase()
      return name.includes(query)
    })
  }, [villages, villageSearchQuery, currentLang])

  // Open region sheet
  const handleOpenRegionSheet = () => {
    setTempSelectedRegions([...selectedRegions])
    setRegionSearchQuery('')
    setShowRegionSheet(true)
  }

  // Close region sheet and open village sheet
  const handleRegionDone = () => {
    onRegionsChange(tempSelectedRegions)
    setShowRegionSheet(false)
    if (tempSelectedRegions.length > 0) {
      // Open village sheet after a short delay
      setTimeout(() => {
        setTempSelectedVillages([...selectedVillages])
        setVillageSearchQuery('')
        setShowVillageSheet(true)
      }, 300)
    }
  }

  // Toggle region selection
  const toggleRegion = (regionId: string) => {
    setTempSelectedRegions(prev => {
      if (prev.includes(regionId)) {
        return prev.filter(id => id !== regionId)
      } else {
        return [...prev, regionId]
      }
    })
  }

  // Open village sheet
  const handleOpenVillageSheet = () => {
    if (selectedRegions.length === 0) return
    setTempSelectedVillages([...selectedVillages])
    setVillageSearchQuery('')
    setShowVillageSheet(true)
  }

  // Close village sheet
  const handleVillageDone = () => {
    onVillagesChange(tempSelectedVillages)
    setShowVillageSheet(false)
  }

  // Toggle village selection
  const toggleVillage = (villageId: string) => {
    setTempSelectedVillages(prev => {
      if (prev.includes(villageId)) {
        return prev.filter(id => id !== villageId)
      } else {
        return [...prev, villageId]
      }
    })
  }

  // Clear all regions
  const handleClearRegions = () => {
    setTempSelectedRegions([])
  }

  // Clear all villages
  const handleClearVillages = () => {
    setTempSelectedVillages([])
  }

  // Get selected region names
  const selectedRegionNames = useMemo(() => {
    return selectedRegions
      .map(id => {
        const region = regions.find(r => r.id === id)
        return region ? getLocalizedName(region) : ''
      })
      .filter(Boolean)
  }, [selectedRegions, regions, currentLang])

  // Get selected village names
  const selectedVillageNames = useMemo(() => {
    return selectedVillages
      .map(id => {
        const village = villages.find(v => v.id === id)
        return village ? getLocalizedName(village) : ''
      })
      .filter(Boolean)
  }, [selectedVillages, villages, currentLang])

  // Render region item
  const renderRegionItem = ({ item }: { item: Region }) => {
    const isSelected = tempSelectedRegions.includes(item.id)
    const name = getLocalizedName(item)
    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() => toggleRegion(item.id)}
      >
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Icon name="check" size={16} color={colors.white} />}
          </View>
        </View>
        <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
          {name}
        </Text>
      </TouchableOpacity>
    )
  }

  // Render village item
  const renderVillageItem = ({ item }: { item: Village }) => {
    const isSelected = tempSelectedVillages.includes(item.id)
    const name = getLocalizedName(item)
    
    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() => toggleVillage(item.id)}
      >
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Icon name="check" size={16} color={colors.white} />}
          </View>
        </View>
        <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
          {name}
        </Text>
      </TouchableOpacity>
    )
  }

  // Render skeleton loader
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.skeletonItem}>
          <View style={styles.skeletonCheckbox} />
          <View style={styles.skeletonText} />
        </View>
      ))}
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Region Selector Button */}
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={handleOpenRegionSheet}
      >
        <View style={styles.selectorButtonContent}>
          <Text style={styles.selectorButtonLabel}>{t('addAnnouncement.region')}</Text>
          <Text style={styles.selectorButtonCount}>
            {selectedRegions.length > 0 ? `(${selectedRegions.length} ${t('common.selected')})` : ''}
          </Text>
        </View>
        <Icon name="chevronDown" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Village Selector Button */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          selectedRegions.length === 0 && styles.selectorButtonDisabled
        ]}
        onPress={handleOpenVillageSheet}
        disabled={selectedRegions.length === 0}
      >
        <View style={styles.selectorButtonContent}>
          <Text style={[
            styles.selectorButtonLabel,
            selectedRegions.length === 0 && styles.selectorButtonLabelDisabled
          ]}>
            {t('addAnnouncement.village')}
          </Text>
          <Text style={styles.selectorButtonCount}>
            {selectedVillages.length > 0 ? `(${selectedVillages.length} ${t('common.selected')})` : ''}
          </Text>
        </View>
        <Icon 
          name="chevronDown" 
          size={20} 
          color={selectedRegions.length === 0 ? colors.textPlaceholder : colors.textSecondary} 
        />
      </TouchableOpacity>

      {/* Selected Chips */}
      {/* {selectedRegionNames.length > 0 && (
        <View style={styles.chipsContainer}>
          <Text style={styles.chipsLabel}>{t('addAnnouncement.region')}:</Text>
          <View style={styles.chipsRow}>
            {selectedRegionNames.map((name, index) => (
              <View key={selectedRegions[index]} style={styles.chip}>
                <Text style={styles.chipText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {selectedVillageNames.length > 0 && (
        <View style={styles.chipsContainer}>
          <Text style={styles.chipsLabel}>{t('addAnnouncement.village')}:</Text>
          <View style={styles.chipsRow}>
            {selectedVillageNames.map((name, index) => (
              <View key={selectedVillages[index]} style={styles.chip}>
                <Text style={styles.chipText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      )} */}

      {/* Region Bottom Sheet */}
      <Modal
        visible={showRegionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegionSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowRegionSheet(false)}
          />
          <View style={styles.bottomSheet}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />
            
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t('addAnnouncement.region')} {tempSelectedRegions.length > 0 && `(${tempSelectedRegions.length} ${t('common.selected')})`}
              </Text>
              {tempSelectedRegions.length > 0 && (
                <TouchableOpacity onPress={handleClearRegions}>
                  <Text style={styles.clearButton}>{t('common.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textPlaceholder}
                value={regionSearchQuery}
                onChangeText={setRegionSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {regionSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setRegionSearchQuery('')}>
                  <Icon name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <View style={styles.listContainer}>
              {loadingRegions ? (
                renderSkeleton()
              ) : filteredRegions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {regions.length === 0 
                      ? t('common.loading') || 'Loading regions...'
                      : t('common.noResults')
                    }
                  </Text>
                  {regions.length === 0 && (
                    <Text style={[styles.emptyText, { marginTop: 8, fontSize: 12 }]}>
                      Regions: {regions.length}, Loading: {loadingRegions ? 'Yes' : 'No'}
                    </Text>
                  )}
                </View>
              ) : (
                <FlatList
                  style={{ height: 600 }}
                  data={filteredRegions}
                  renderItem={renderRegionItem}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>{t('common.noResults')}</Text>
                    </View>
                  }
                />
              )}
            </View>

            {/* Done Button */}
            <View style={styles.doneButtonContainer}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleRegionDone}
              >
                <Text style={styles.doneButtonText}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Village Bottom Sheet */}
      <Modal
        visible={showVillageSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVillageSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowVillageSheet(false)}
          />
          <View style={styles.bottomSheet}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />
            
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t('addAnnouncement.village')} {tempSelectedVillages.length > 0 && `(${tempSelectedVillages.length} ${t('common.selected')})`}
              </Text>
              {tempSelectedVillages.length > 0 && (
                <TouchableOpacity onPress={handleClearVillages}>
                  <Text style={styles.clearButton}>{t('common.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textPlaceholder}
                value={villageSearchQuery}
                onChangeText={setVillageSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {villageSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setVillageSearchQuery('')}>
                  <Icon name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <View style={styles.listContainer}>
              {loadingVillages ? (
                renderSkeleton()
              ) : filteredVillages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {selectedRegions.length === 0 
                      ? t('addAnnouncement.selectRegionFirst')
                      : t('common.noResults')
                    }
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredVillages}
                  renderItem={renderVillageItem}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            {/* Done Button */}
            <View style={styles.doneButtonContainer}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleVillageDone}
              >
                <Text style={styles.doneButtonText}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 50,
  },
  selectorButtonDisabled: {
    opacity: 0.5,
  },
  selectorButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorButtonLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  selectorButtonLabelDisabled: {
    color: colors.textPlaceholder,
  },
  selectorButtonCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  chipsContainer: {
    marginTop: 8,
  },
  chipsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clearButton: {
    fontSize: 16,
    color: colors.buttonPrimary,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    gap: 12,
  },
  searchIcon: {
    color: colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
  },
  listContainer: {
    flex: 1,
    height: '90%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listItemSelected: {
    backgroundColor: colors.backgroundSecondary,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  listItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  listItemTextSelected: {
    fontWeight: '500',
  },
  doneButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  doneButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  skeletonContainer: {
    paddingHorizontal: 20,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  skeletonCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
  },
  skeletonText: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
})

