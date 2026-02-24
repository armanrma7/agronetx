import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import Icon from '../../components/Icon'
import * as announcementsAPI from '../../lib/api/announcements.api'
import { AppHeader } from '../../components/AppHeader'
import { useAnnouncementsStore } from '../../store/announcements/useAnnouncementsStore'

const { width } = Dimensions.get('window')

interface RouteParams {
  announcementId: string
}

export function AnnouncementDetailPage() {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { user } = useAuth()
  const { announcementId } = (route.params as RouteParams) || { announcementId: '' }

  const { cache, fetchById, cancelAnnouncement: cancelAnnouncementInStore, setInCache } = useAnnouncementsStore()
  const [announcement, setAnnouncement] = useState<Announcement | null>(cache[announcementId] ?? null)
  const [loading, setLoading] = useState(!cache[announcementId])
  const [cancelling, setCancelling] = useState(false)
  const [contactModalVisible, setContactModalVisible] = useState(false)
  const [regionNames, setRegionNames] = useState<string[]>([])
  const [villageNames, setVillageNames] = useState<string[]>([])
  const [visibleRegionsCount, setVisibleRegionsCount] = useState(2)
  const [visibleVillagesCount, setVisibleVillagesCount] = useState(2)
  const [hasApprovedApplicationFromApi, setHasApprovedApplicationFromApi] = useState(false)
   
  useEffect(() => {
    fetchAnnouncement()
    // Track announcement view
    if (announcementId) {
      announcementsAPI.trackAnnouncementViewAPI(announcementId)
    }
  }, [announcementId])

  // When announcement is loaded and we're not the owner: ensure Contact shows if current user has an approved application
  // (detail API might not include applications for viewers, so we fetch via /applications/announcement/{id})
  useEffect(() => {
    if (!announcement?.id || !user?.id || announcement.owner_id === user.id) {
      setHasApprovedApplicationFromApi(false)
      return
    }
    let cancelled = false
    announcementsAPI.getApplicationsByAnnouncementAPI(announcement.id)
      .then((list) => {
        if (cancelled) return
        const myId = String(user.id)
        const hasMineApproved = list.some(
          (app) => String(app.user_id) === myId && /^(approved|accepted)$/i.test(app.status || '')
        )
        setHasApprovedApplicationFromApi(hasMineApproved)
      })
      .catch(() => {
        if (!cancelled) setHasApprovedApplicationFromApi(false)
      })
    return () => { cancelled = true }
  }, [announcement?.id, user?.id, announcement?.owner_id])

  // Extract region and village names from announcement when loaded
  useEffect(() => {
      if (announcement) {
        const announcementData = announcement as any
        
        // Get region names from regions_data array
        let regionNamesList: string[] = []
        if (announcementData.regions_data && Array.isArray(announcementData.regions_data)) {
          regionNamesList = announcementData.regions_data
            .map((region: any) => {
              if (typeof region === 'string') return region
              if (region?.name) return region.name
              if (region?.name_hy) return region.name_hy
              if (region?.name_ru) return region.name_ru
              if (region?.name_en) return region.name_en
              return null
            })
            .filter((name: string | null): name is string => name !== null)
        }
        
        // Fallback to other field names
        if (regionNamesList.length === 0) {
          const regions = announcementData.region_names || announcementData.location_region_names || []
          if (regions.length > 0) {
            regionNamesList = regions
          } else if (announcement.regions?.[0] && typeof announcement.regions[0] === 'string' && !announcement.regions[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            regionNamesList = [announcement.regions[0]]
          }
        }
        
        if (regionNamesList.length > 0) {
          setRegionNames(regionNamesList)
        }
        
        // Get village names from villages_data array
        let villageNamesList: string[] = []
        if (announcementData.villages_data && Array.isArray(announcementData.villages_data)) {
          villageNamesList = announcementData.villages_data
            .map((village: any) => {
              if (typeof village === 'string') return village
              if (village?.name) return village.name
              if (village?.name_hy) return village.name_hy
              if (village?.name_ru) return village.name_ru
              if (village?.name_en) return village.name_en
              return null
            })
            .filter((name: string | null): name is string => name !== null)
        }
        
        // Fallback to other field names
        if (villageNamesList.length === 0) {
          const villages = announcementData.village_names || announcementData.location_village_names || []
          if (villages.length > 0) {
            villageNamesList = villages
          } else if (announcement.villages?.[0] && typeof announcement.villages[0] === 'string' && !announcement.villages[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            villageNamesList = [announcement.villages[0]]
          }
        }
        
        if (villageNamesList.length > 0) {
          setVillageNames(villageNamesList)
        }
        
        // Reset visible counts when announcement changes
        setVisibleRegionsCount(2)
        setVisibleVillagesCount(2)
      }
  }, [announcement])


  const fetchAnnouncement = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchById(announcementId)
      setAnnouncement(data)
    } catch (err) {
      setAnnouncement(null)
    } finally {
      setLoading(false)
    }
  }, [announcementId, fetchById])


  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : start
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const months = monthKeys.map(key => t(`months.${key}`))
    return `${months[start.getMonth()]}. ${start.getDate()} - ${months[end.getMonth()]}. ${end.getDate()}, ${end.getFullYear()}`
  }

  const getStatusLabel = (status: string) => {
    // Show "Ակտիվ" if published, otherwise "Փակված"
    if (status === 'published' || status === 'active') {
      return t('announcementDetail.active')
    }
    return t('announcementDetail.closed')
  }

  const getStatusColor = (status: string) => {
    // Green for published/active, gray for others
    if (status === 'published' || status === 'active') {
      return colors.success
    }
    return colors.textTertiary
  }

  const isPublished = (status: string) => {
    return status === 'published' || status === 'active'
  }

  const getTypeLabel = (announcement: Announcement) => {
    const announcementData = announcement as any
    const subtype = announcementData.subtype || announcementData.apiType
    const category = announcement.type
    
    // Check API type first (sell/buy/rent)
    if (subtype === 'sell' || subtype === 'offer') {
      return t('announcementDetail.sell')
    }
    if (subtype === 'buy' || subtype === 'requirement') {
      return t('announcementDetail.buy')
    }
    if (subtype === 'rent') {
      return t('announcementDetail.rent')
    }
    
    // Fallback to category (type is sell/buy, category is goods/service/rent)
    const cat = announcement.category || category
    switch (cat) {
      case 'goods':
        return t('announcementDetail.sell')
      case 'service':
        return t('announcementDetail.serviceOffer')
      case 'rent':
        return t('announcementDetail.rent')
      default:
        return t('announcementDetail.sell')
    }
  }

  const getCategoryLabel = (announcement: Announcement) => {
    const announcementData = announcement as any
    const currentLang = (i18n.language || 'hy').split('-')[0]
    
    // Try to get category name from API
    if (currentLang === 'hy' && announcementData.category_name_hy) {
      return announcementData.category_name_hy
    }
    if (currentLang === 'ru' && announcementData.category_name_ru) {
      return announcementData.category_name_ru
    }
    if (currentLang === 'en' && announcementData.category_name_en) {
      return announcementData.category_name_en
    }
    if (announcementData.category_name) {
      return announcementData.category_name
    }
    
    // Fallback to category-based labels
    switch (announcement.category) {
      case 'goods':
        return t('announcementDetail.categoryFruit')
      case 'service':
        return t('announcementDetail.categoryWork')
      case 'rent':
        return t('announcementDetail.categoryEquipment')
      default:
        return ''
    }
  }

  const getItemLabel = (announcement: Announcement) => {
    const announcementData = announcement as any
    const currentLang = (i18n.language || 'hy').split('-')[0]
    
    // Try to get item name from API
    if (currentLang === 'hy' && announcementData.item_name_hy_full) {
      return announcementData.item_name_hy_full
    }
    if (currentLang === 'ru' && announcementData.item_name_ru_full) {
      return announcementData.item_name_ru_full
    }
    if (currentLang === 'en' && announcementData.item_name_en_full) {
      return announcementData.item_name_en_full
    }
    if (announcementData.item_name_full) {
      return announcementData.item_name_full
    }
    
    // Try translated name fields
    if (currentLang === 'hy' && announcementData.name_hy) {
      return announcementData.name_hy
    }
    if (currentLang === 'ru' && announcementData.name_ru) {
      return announcementData.name_ru
    }
    if (currentLang === 'en' && announcementData.name_en) {
      return announcementData.name_en
    }
    
    // Fallback to item names or legacy title
    const item = announcement.item
    return (item?.name_am || item?.name_en || item?.name_ru) || (announcementData.title || announcementData.item_name) || t('announcementDetail.defaultItemName')
  }

  const getInitials = (name?: string, surname?: string) => {
    const first = name?.charAt(0) || ''
    const last = surname?.charAt(0) || ''
    return (first + last).toUpperCase()
  }

  const handleContact = () => {
    setContactModalVisible(true)
  }

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`)
  }

  const handleApply = () => {
    if (!announcement) return
    
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate('ApplicationForm', {
        announcementId: announcement.id,
        announcementType: announcement.category as 'goods' | 'service' | 'rent',
        announcementTitle: getItemLabel(announcement),
      })
    } else {
      ;(navigation as any).navigate('ApplicationForm', {
        announcementId: announcement.id,
        announcementType: announcement.category as 'goods' | 'service' | 'rent',
        announcementTitle: getItemLabel(announcement),
      })
    }
  }

  const handleEdit = () => {
    if (!announcement) return
    
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate('NewAnnouncementForm', {
        type: announcement.category as 'goods' | 'service' | 'rent',
        announcementId: announcement.id,
        announcement: announcement,
      })
    } else {
      ;(navigation as any).navigate('NewAnnouncementForm', {
        type: announcement.category as 'goods' | 'service' | 'rent',
        announcementId: announcement.id,
        announcement: announcement,
      })
    }
  }

  const handleCancel = async () => {
    if (!announcement) return
    
    setCancelling(true)
    try {
      // Cancel via store — updates cache + list optimistically
      await cancelAnnouncementInStore(announcement.id)
      setAnnouncement(prev => prev ? { ...prev, status: 'cancelled' } : prev)
      
      // Show success message or navigate back
      Alert.alert(
        t('common.success') || 'Հաջողություն',
        t('announcements.cancelled') || 'Հայտարարությունը չեղարկված է',
        [
          {
            text: t('common.ok') || 'Լավ',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error: any) {
      console.error('Error cancelling announcement:', error)
      Alert.alert(
        t('common.error') || 'Սխալ',
        error.response?.data?.message || t('announcements.cancelError') || 'Հայտարարությունը չեղարկելը ձախողվեց'
      )
    } finally {
      setCancelling(false)
    }
  }

  const handleSearchPress = () => {
    console.log('Search pressed')
  }

  const handleProfilePress = () => {
    console.log('Profile pressed')
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.buttonPrimary }}>
        <View style={styles.container}>
          {/* Header */}
          <AppHeader
            showBack
            onSearchPress={handleSearchPress}
            onProfilePress={handleProfilePress}
          />
          
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (!announcement) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.buttonPrimary }}>
        <View style={styles.container}>
          {/* Header */}
          <AppHeader
            showBack
            onSearchPress={handleSearchPress}
            onProfilePress={handleProfilePress}
          />
          
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{t('announcements.notFound')}</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }
  
  const startDate = announcement.date_from || announcement.created_at
  const endDate = announcement.date_to || announcement.created_at
  const images = announcement.images || []
  const dailyLimit = announcement.daily_limit ? Number(announcement.daily_limit) : 0
  const isPublishedStatus = isPublished(announcement.status)
  // Edit is allowed when announcement is pending or not yet published
  const canEditAnnouncement = announcement.status === 'pending' || !isPublishedStatus
  const isMyAnnouncement = user?.id && announcement.owner_id === user.id
  const hasUserApplied = (): boolean => {
    if (!user?.id || !announcement) return false
    const a = announcement as any
    if (a.my_applications_count !== undefined && a.my_applications_count > 0) return true
    const apps = a.applications
    if (Array.isArray(apps) && apps.some((app: any) => (app.user_id || app.userId) === user.id)) return true
    return false
  }

  // User can apply only if they do NOT have a pending application (rejected/closed can apply again)
  const hasPendingApplication = (): boolean => {
    if (!user?.id || !announcement) return false
    const a = announcement as any
    const apps = a.applications
    if (!Array.isArray(apps) || apps.length === 0) return false
    const myId = String(user.id)
    const pendingStatus = (s: string | undefined) => /^pending$/i.test((s || '').trim())
    return apps.some((app: any) => {
      const applicantId = app.applicant_id ?? app.user_id ?? app.userId
      return applicantId && String(applicantId) === myId && pendingStatus(app.status)
    })
  }

  const hasApplied = hasUserApplied()
  const canApply = !hasPendingApplication()

  /**
   * Contact: show only when there is an approved application linking the current user (me) and this announcement.
   * Check (1) applicants on the announcement and (2) fetched applications list.
   */
  const isApprovedStatus = (status: string | undefined): boolean =>
    /^(approved|accepted)$/i.test((status || '').trim())

  const hasApprovedApplication = (): boolean => {
    if (!user?.id || !announcement) return false
    const a = announcement as any
    const apps = a.applications
    if (!Array.isArray(apps) || apps.length === 0) return false
    const myId = String(user.id)
    return apps.some((app: any) => {
      const applicantId = app.applicant_id ?? app.user_id ?? app.userId
      if (!applicantId || !isApprovedStatus(app.status)) return false
      return String(applicantId) === myId
    })
  }

  const canContact = hasApprovedApplication() || hasApprovedApplicationFromApi

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.buttonPrimary }}>
     <View style={styles.container}>
        {/* Header */}
        <AppHeader
          showBack
          onSearchPress={handleSearchPress}
          onProfilePress={handleProfilePress}
        />
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Top Row: Status Badge + Engagement Metrics */}
          <View style={styles.topRow}>
            {isPublishedStatus && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(announcement.status) }]}>
                <Text style={styles.statusText}>{getStatusLabel(announcement.status)}</Text>
              </View>
            )}
            <View style={styles.engagementMetrics}>
              <View style={styles.metricItem}>
                <Icon name="visibility" size={16} color={colors.textSecondary} />
                <Text style={styles.metricText}>{(announcement as any).views_count || 0}</Text>
              </View>
              <View style={styles.metricItem}>
                <Icon name="people" size={16} color={colors.textSecondary} />
                <Text style={styles.metricText}>
                  {announcement.applications_count ?? 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Type Label */}
          <Text style={styles.typeLabel}>{getTypeLabel(announcement)}</Text>

          <View style={styles.divider}/>

          {/* Category and Item */}
          <View style={styles.categoryItemContainer}>
            <Text style={styles.categoryLabel}>{getCategoryLabel(announcement)}</Text>
            <Text style={styles.itemLabel}>{getItemLabel(announcement)}</Text>
          </View>

          {/* Description */}
          {announcement.description && (
            <Text style={styles.description}>{announcement.description}</Text>
          )}

          {/* Images */}
          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              {images.slice(0, 3).map((imageUrl: string, index: number) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.image}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          )}
          <View style={styles.divider}/>
          {/* Availability and Price Row */}
          <View style={styles.priceAvailabilityRow}>
            <View style={styles.priceAvailabilityItem}>
              <Text style={styles.priceAvailabilityLabel}>{t('announcementDetail.availability')}</Text>
              <Text style={styles.priceAvailabilityValue}>
                {Number(announcement.available_quantity || 0).toLocaleString()} {announcement.unit}
              </Text>
            </View>
            <View style={styles.priceAvailabilityItem}>
              <Text style={styles.priceAvailabilityLabel}>{t('announcementDetail.price')}</Text>
              <Text style={styles.priceAvailabilityValue}>
                {Number(announcement.price || 0).toLocaleString()} {t('common.currency')}/{(announcement as any).price_unit ?? announcement.unit}
              </Text>
            </View>
          </View>

          {/* Availability Limit - Only for goods */}
          {announcement.category === 'goods' && dailyLimit > 0 && (
            <View style={styles.limitRow}>
              <View style={styles.limitLabelContainer}>
                <Text style={styles.limitLabel}>{t('announcementDetail.limit')}</Text>
                <Icon name="info" size={16} color={colors.primary} />
              </View>
              <Text style={styles.limitValue}>{dailyLimit.toLocaleString()} {announcement.unit}/{t('common.perDay')}</Text>
            </View>
          )}

          {/* Date Range */}
          {(startDate || endDate) && (
            <View style={styles.dateRow}>
              <Icon name="calendar" size={20} color={colors.textSecondary} />
              <Text style={styles.dateLabel}>{t('announcementDetail.availableFrom')}</Text>
              <Text style={styles.dateValue}>{formatDateRange(startDate, endDate)}</Text>
            </View>
          )}

          {/* Location Section */}
          {(regionNames.length > 0 || villageNames.length > 0) && (
            <View style={styles.locationSection}>
              {/* Regions */}
              {regionNames.length > 0 && (
                <View style={styles.locationRow}>
                  <Icon name="location" size={20} color={colors.textSecondary} />
                  <Text style={styles.locationLabel}>{t('announcementDetail.region')}</Text>
                  <View style={styles.locationValueContainer}>
                    <Text style={styles.locationValue}>
                      {regionNames.slice(0, visibleRegionsCount).join(', ')}
                    </Text>
                    {regionNames.length > visibleRegionsCount && (
                      <TouchableOpacity
                        onPress={() => {
                          const remaining = regionNames.length - visibleRegionsCount
                          const toShow = Math.min(5, remaining)
                          setVisibleRegionsCount(visibleRegionsCount + toShow)
                        }}
                        style={styles.showMoreButton}
                      >
                        <Text style={styles.showMoreText}>
                          +{Math.min(5, regionNames.length - visibleRegionsCount)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {visibleRegionsCount > 2 && (
                      <TouchableOpacity
                        onPress={() => {
                          const toHide = Math.min(5, visibleRegionsCount - 2)
                          setVisibleRegionsCount(visibleRegionsCount - toHide)
                        }}
                        style={styles.showMoreButton}
                      >
                        <Text style={styles.showLessText}>-{Math.min(5, visibleRegionsCount - 2)}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Villages */}
              {villageNames.length > 0 && (
                <View style={styles.locationRow}>
                  <Icon name="location" size={20} color={colors.textSecondary} />
                  <Text style={styles.locationLabel}>{t('announcementDetail.village')}</Text>
                  <View style={styles.locationValueContainer}>
                    <Text style={styles.locationValue}>
                      {villageNames.slice(0, visibleVillagesCount).join(', ')}
                    </Text>
                    {villageNames.length > visibleVillagesCount && (
                      <TouchableOpacity
                        onPress={() => {
                          const remaining = villageNames.length - visibleVillagesCount
                          const toShow = Math.min(5, remaining)
                          setVisibleVillagesCount(visibleVillagesCount + toShow)
                        }}
                        style={styles.showMoreButton}
                      >
                        <Text style={styles.showMoreText}>
                          +{Math.min(5, villageNames.length - visibleVillagesCount)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {visibleVillagesCount > 2 && (
                      <TouchableOpacity
                        onPress={() => {
                          const toHide = Math.min(5, visibleVillagesCount - 2)
                          setVisibleVillagesCount(visibleVillagesCount - toHide)
                        }}
                        style={styles.showMoreButton}
                      >
                        <Text style={styles.showLessText}>-{Math.min(5, visibleVillagesCount - 2)}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

        </ScrollView>

        {/* Action Buttons */}
        {isMyAnnouncement ? (
          // Owner's buttons: Edit and Cancel (if not published), Cancel only (if published and not cancelled)
          <View style={styles.actionButtons}>
            {canEditAnnouncement && (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>{t('common.edit')}</Text>
              </TouchableOpacity>
            )}
            {announcement.status !== 'canceled' && (
              cancelling ? (
                <View style={styles.cancelButton}>
                  <ActivityIndicator size="small" color={colors.error} />
                </View>
              ) : (
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        ) : (
          // Non-owner buttons: Contact (if approved application) and Apply (if not applied)
          isPublishedStatus && (
            <View style={styles.actionButtons}>
              {canContact && (
                <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
                  <Text style={styles.contactButtonText}>{t('announcementDetail.contact')}</Text>
                </TouchableOpacity>
              )}
              {canApply && (
                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                  <Text style={styles.applyButtonText}>{t('announcements.apply')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}

      
        {/* Contact Modal */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setContactModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.contactDetails')}</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.contactProfile}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {announcement.owner?.full_name ? getInitials(announcement.owner.full_name.trim().split(/\s+/)[0], announcement.owner.full_name.trim().split(/\s+/)[1]) : '-'}
                </Text>
              </View>
              <Text style={styles.contactName}>
                {announcement.owner?.full_name ?? '-'}
              </Text>
              <Text style={styles.contactProfession}>{t('common.farmer')}</Text>
            </View>

            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>{t('profile.primaryNumber')}</Text>
                <Text style={styles.contactValue}>{announcement.owner?.phone || '-'}</Text>
              </View>

              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>{t('addAnnouncement.region')}</Text>
                <Text style={styles.contactValue}>{announcement.owner?.region ? (announcement.owner.region.name_am || announcement.owner.region.name_en || announcement.owner.region.name_ru) : (announcement as any).owner_region_name || '-'}</Text>
              </View>

              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>{t('addAnnouncement.village')}</Text>
                <Text style={styles.contactValue}>{announcement.owner?.village ? (announcement.owner.village.name_am || announcement.owner.village.name_en || announcement.owner.village.name_ru) : (announcement as any).owner_village_name || '-'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(announcement.owner?.phone || '')}
            >
              <Icon name="phone" size={20} color={colors.white} />
              <Text style={styles.callButtonText}>{t('announcementDetail.call')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  engagementMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  categoryItemContainer: {
    marginBottom: 12,
    gap: 4,
  },
  categoryLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 4,
    marginBottom: 20,
  },
  imageWrapper: {
    width: (width - 60) / 3,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 11,
    backgroundColor: '#E5E7EB',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 16,
  },
  priceAvailabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  priceAvailabilityItem: {
    // flex: 1,
  },
  priceAvailabilityLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  priceAvailabilityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  limitLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  limitLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  locationSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  locationLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  locationValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 4,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  skeletonText: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 20,
  },
  showMoreButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  showLessText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  contactButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Light gray border
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error, // Red text
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactProfile: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  contactProfession: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  contactInfo: {
    marginBottom: 24,
  },
  contactRow: {
    marginBottom: 16,
  },
  contactLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
})
