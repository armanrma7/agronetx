import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import Icon from '../../components/Icon'
import * as announcementsAPI from '../../lib/api/announcements.api'
import type { ApplicationListItem } from '../../lib/api/announcements.api'
import { AppHeader } from '../../components/AppHeader'
import { ContactBottomSheet, type ContactSheetRow } from '../../components/ContactBottomSheet'
import { useAnnouncementDetail, useCancelAnnouncement, useCloseAnnouncement } from '../../hooks/useAnnouncementQueries'
import { useApplicationsByAnnouncement } from '../../hooks/useApplicationQueries'
import {
  isAnnouncementOwner,
  canCancelAnnouncement,
  canCloseAnnouncement,
  canUpdateAnnouncement,
  canApplyOrApplyAgain,
  isReapply,
  canApplicantViewContacts,
  applicationIs,
  announcementIs,
} from '../../utils/announcementActions'
import { translateMeasureUnit } from '../../utils/units'

const { width } = Dimensions.get('window')

function applicationBelongsToUser(a: ApplicationListItem, userId: string | undefined): boolean {
  if (!userId) return false
  const u = String(userId)
  if (a.user_id != null && String(a.user_id) === u) return true
  if (a.applicant?.id != null && String(a.applicant.id) === u) return true
  return false
}

/** Merge embedded announcement applications with GET /applications/announcement list (API wins on id clash). */
function mergeAnnouncementApplications(
  announcement: Announcement,
  fromApi: ApplicationListItem[],
): ApplicationListItem[] {
  const raw = (announcement as any).applications
  const embedded: ApplicationListItem[] = Array.isArray(raw)
    ? raw.map(
        (app: any): ApplicationListItem => ({
          id: String(app.id ?? ''),
          user_id: String(app.user_id ?? app.userId ?? app.applicant_id ?? app.applicant?.id ?? ''),
          status: String(app.status ?? 'pending'),
          announcement_id: announcement.id,
          delivery_dates: Array.isArray(app.delivery_dates)
            ? app.delivery_dates
            : app.delivery_dates
              ? [app.delivery_dates]
              : [],
          applicant: app.applicant
            ? {
                id: app.applicant.id,
                full_name: app.applicant.full_name,
                phone: app.applicant.phone,
                user_type: app.applicant.user_type,
                profile_picture: app.applicant.profile_picture ?? null,
              }
            : undefined,
        }),
      )
    : []

  const byId = new Map<string, ApplicationListItem>()
  for (const a of embedded) {
    if (a.id) byId.set(a.id, a)
  }
  for (const a of fromApi) {
    if (a.id) {
      const prev = byId.get(a.id)
      byId.set(a.id, prev ? { ...prev, ...a } : a)
    }
  }
  const withoutId = fromApi.filter(a => !a.id)
  return [...Array.from(byId.values()), ...withoutId]
}

interface RouteParams {
  announcementId: string
}

export function AnnouncementDetailPage() {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { user } = useAuth()
  const { announcementId } = (route.params as RouteParams) || { announcementId: '' }

  const { data: announcement, isLoading: loading } = useAnnouncementDetail(announcementId, !!announcementId)
  const { data: allApplicationsData = [] } = useApplicationsByAnnouncement(announcementId, !!announcementId)
  const cancelMutation = useCancelAnnouncement()
  const closeMutation = useCloseAnnouncement()
  const cancelling = cancelMutation.isPending
  const closing = closeMutation.isPending
  const [contactModalVisible, setContactModalVisible] = useState(false)
  const [visibleRegionsCount, setVisibleRegionsCount] = useState(2)
  const [visibleVillagesCount, setVisibleVillagesCount] = useState(2)

  // Image viewer state (must be declared before any early returns)
  const [imageViewerVisible, setImageViewerVisible] = useState(false)
  const [imageViewerIndex, setImageViewerIndex] = useState(0)
  const imageListRef = useRef<FlatList<string> | null>(null)

  const ownerContactSheetRows = useMemo((): ContactSheetRow[] => {
    if (!announcement) return []
    const owner = announcement.owner
    const regionVal = owner?.region
      ? String(owner.region.name_am || owner.region.name_en || owner.region.name_ru || '')
      : String((announcement as any).owner_region_name || '')
    const villageVal = owner?.village
      ? String(owner.village.name_am || owner.village.name_en || owner.village.name_ru || '')
      : String((announcement as any).owner_village_name || '')
    return [
      { label: t('profile.primaryNumber'), value: owner?.phone || '-' },
      { label: t('addAnnouncement.region'), value: regionVal.trim() ? regionVal : '-' },
      { label: t('addAnnouncement.village'), value: villageVal.trim() ? villageVal : '-' },
    ]
  }, [announcement, t])

  const ownerDisplayRoleKey = useMemo(() => {
    if (!announcement?.owner) return 'farmer'
    const o = announcement.owner as any
    const u = String(o?.user_type ?? o?.userType ?? 'farmer').toLowerCase()
    if (u === 'company' || u === 'organization') return 'organization'
    if (u === 'buyer') return 'buyer'
    return 'farmer'
  }, [announcement])

  useEffect(() => {
    if (announcementId) {
      announcementsAPI.trackAnnouncementViewAPI(announcementId)
    }
  }, [announcementId])

  // Derive region/village names directly from announcement data (no state/effect needed)
  const regionNames = useMemo((): string[] => {
    if (!announcement) return []
    const announcementData = announcement as any
    if (announcementData.regions_data && Array.isArray(announcementData.regions_data)) {
      const names = announcementData.regions_data
        .map((r: any) => {
          if (typeof r === 'string') return r
          return r?.name || r?.name_hy || r?.name_ru || r?.name_en || null
        })
        .filter((n: string | null): n is string => n !== null)
      if (names.length > 0) return names
    }
    const fallback = announcementData.region_names || announcementData.location_region_names || []
    if (fallback.length > 0) return fallback
    if (announcement.regions?.[0] && typeof announcement.regions[0] === 'string' && !announcement.regions[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return [announcement.regions[0]]
    }
    return []
  }, [announcement])

  const villageNames = useMemo((): string[] => {
    if (!announcement) return []
    const announcementData = announcement as any
    if (announcementData.villages_data && Array.isArray(announcementData.villages_data)) {
      const names = announcementData.villages_data
        .map((v: any) => {
          if (typeof v === 'string') return v
          return v?.name || v?.name_hy || v?.name_ru || v?.name_en || null
        })
        .filter((n: string | null): n is string => n !== null)
      if (names.length > 0) return names
    }
    const fallback = announcementData.village_names || announcementData.location_village_names || []
    if (fallback.length > 0) return fallback
    if (announcement.villages?.[0] && typeof announcement.villages[0] === 'string' && !announcement.villages[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return [announcement.villages[0]]
    }
    return []
  }, [announcement])

  // Reset visible counts when the announcement changes
  useEffect(() => {
    setVisibleRegionsCount(2)
    setVisibleVillagesCount(2)
  }, [announcement?.id])


  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : start
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const months = monthKeys.map(key => t(`months.${key}`))
    return `${months[start.getMonth()]}. ${start.getDate()} - ${months[end.getMonth()]}. ${end.getDate()}, ${end.getFullYear()}`
  }

  const getStatusLabel = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'to_be_verified' || s === 'pending') return t('announcementDetail.toBeVerified')
    if (s === 'active' || s === 'published') return t('announcementDetail.active')
    if (s === 'closed') return t('announcementDetail.closed')
    if (s === 'blocked') return t('announcementDetail.blocked')
    if (s === 'canceled' || s === 'cancelled') return t('announcementDetail.canceled')
    return status
  }

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'active' || s === 'published') return colors.success
    if (s === 'to_be_verified' || s === 'pending') return colors.warning
    if (s === 'blocked') return colors.error
    return colors.textTertiary
  }

  const isPublishedStatus = (status: string) => {
    const s = (status || '').toLowerCase()
    return s === 'active' || s === 'published'
  }

  const getTypeLabel = (announcement: Announcement) => {
    const announcementData = announcement as any
    const subtype = announcementData.subtype || announcementData.apiType || announcement.type

    if (subtype === 'sell' || subtype === 'offer') return t('announcementDetail.sell')
    if (subtype === 'buy' || subtype === 'requirement') return t('announcementDetail.buy')
    if (subtype === 'rent' || announcement.category === 'rent') return t('announcementDetail.rent')

    // Fallback: derive from announcement.type (sell/buy) directly
    if (announcement.type === 'buy') return t('announcementDetail.buy')
    if (announcement.type === 'sell') return t('announcementDetail.sell')

    return t('announcementDetail.sell')
  }

  const getCategoryLabel = (announcement: Announcement) => {
    const announcementData = announcement as any
    const currentLang = (i18n.language || 'hy').split('-')[0]
    const group = announcementData.group
    if (!group) return ''
    if (currentLang === 'hy') return group.name_hy || group.name_am || group.name || ''
    if (currentLang === 'ru') return group.name_ru || group.name_am || group.name || ''
    if (currentLang === 'en') return group.name_en || group.name_am || group.name || ''
    return group.name_am || group.name || ''
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

  const handleContact = () => {
    setContactModalVisible(true)
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

  const handleCancel = () => {
    if (!announcement) return
    Alert.alert(t('announcements.cancelTitle'), t('announcements.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () =>
          cancelMutation.mutate(announcement.id, {
            onSuccess: () =>
              Alert.alert(t('common.success'), t('announcements.cancelled'), [
                { text: t('common.ok'), onPress: () => navigation.goBack() },
              ]),
            onError: (error: any) =>
              Alert.alert(t('common.error'), error.response?.data?.message || t('announcements.cancelError')),
          }),
      },
    ])
  }

  const handleClose = () => {
    if (!announcement) return
    Alert.alert(t('announcements.closeAnnouncementTitle'), t('announcements.closeAnnouncementConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () =>
          closeMutation.mutate(announcement.id, {
            onSuccess: () =>
              Alert.alert(t('common.success'), t('announcements.closedAnnouncement'), [
                { text: t('common.ok'), onPress: () => navigation.goBack() },
              ]),
            onError: (error: any) =>
              Alert.alert(t('common.error'), error.response?.data?.message || t('announcements.closeAnnouncementError')),
          }),
      },
    ])
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
            <ActivityIndicator size="large" color={colors.buttonPrimary} />
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

  // ── Derive action state from fetched applications ─────────────────────────
  const allApplications: ApplicationListItem[] = mergeAnnouncementApplications(
    announcement,
    allApplicationsData,
  )

  const myApplications = user?.id
    ? allApplications.filter(a => applicationBelongsToUser(a, user.id))
    : []

  // Pick the most relevant application: prefer PENDING, then APPROVED, then latest
  const myApplication: ApplicationListItem | null =
    myApplications.find(a => applicationIs.pending(a.status)) ??
    myApplications.find(a => applicationIs.approved(a.status)) ??
    myApplications[0] ??
    null

  const hasAnyApprovedApplication = allApplications.some(a => applicationIs.approved(a.status))

  const isMyAnnouncement = isAnnouncementOwner(announcement, user?.id)
  const showEdit = canUpdateAnnouncement(announcement, user?.id)
  const showCancel = canCancelAnnouncement(announcement, user?.id)
  const showClose = canCloseAnnouncement(announcement, user?.id, hasAnyApprovedApplication)
  const showApply = canApplyOrApplyAgain(announcement, user?.id, myApplication, hasAnyApprovedApplication)
  const showContact = canApplicantViewContacts(announcement, user?.id, myApplications)
  const applyButtonIsReapply = isReapply(myApplication)

  const myHasApprovedApp = myApplications.some(a => applicationIs.approved(a.status))
  const myHasPendingLikeApp = myApplications.some(
    a =>
      applicationIs.pending(a.status) ||
      /^to_be_verified$/i.test(String(a.status || '').trim()),
  )
  const showPendingApplicationNotice =
    !isMyAnnouncement &&
    !!user?.id &&
    myHasPendingLikeApp &&
    !myHasApprovedApp &&
    (announcementIs.active(announcement.status) || announcementIs.closed(announcement.status))

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
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(announcement.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(announcement.status)}</Text>
            </View>
            <View style={styles.engagementMetrics}>
              <View style={styles.metricItem}>
                {(() => {
                  const views = Number((announcement as any).views_count ?? 0) || 0
                  const active = views > 0
                  const c = active ? colors.buttonPrimary : colors.textSecondary
                  return (
                    <>
                      <Icon name="visibility" size={16} color={c} />
                      <Text style={[styles.metricText, active && { color: colors.buttonPrimary }]}>{views}</Text>
                    </>
                  )
                })()}
              </View>
              <View style={styles.metricItem}>
                {(() => {
                  const apps = Number(announcement.applications_count ?? 0) || 0
                  const active = apps > 0
                  const c = active ? colors.buttonPrimary : colors.textSecondary
                  return (
                    <>
                      <Icon name="people" size={16} color={c} />
                      <Text style={[styles.metricText, active && { color: colors.buttonPrimary }]}>
                        {apps}
                      </Text>
                    </>
                  )
                })()}
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
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setImageViewerIndex(index)
                      setImageViewerVisible(true)
                      // Defer scroll until modal/FlatList mounts
                      setTimeout(() => {
                        imageListRef.current?.scrollToIndex?.({ index, animated: false })
                      }, 0)
                    }}
                  >
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.image}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Image Viewer Modal */}
          <Modal
            visible={imageViewerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setImageViewerVisible(false)}
          >
            <View style={styles.imageViewerOverlay}>
              <TouchableOpacity
                style={styles.imageViewerBackdrop}
                activeOpacity={1}
                onPress={() => setImageViewerVisible(false)}
              />
              <SafeAreaView style={styles.imageViewerTopBar}>
                <Text style={styles.imageViewerCounter}>
                  {imageViewerIndex + 1}/{images.length}
                </Text>
                <TouchableOpacity onPress={() => setImageViewerVisible(false)} style={styles.imageViewerCloseBtn}>
                  <Icon name="close" size={26} color={colors.white} />
                </TouchableOpacity>
              </SafeAreaView>
              <FlatList
                ref={(r) => { imageListRef.current = r }}
                data={images}
                keyExtractor={(u, i) => `${i}-${u}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={imageViewerIndex}
                getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
                onMomentumScrollEnd={(e) => {
                  const next = Math.round(e.nativeEvent.contentOffset.x / width)
                  if (next !== imageViewerIndex) setImageViewerIndex(next)
                }}
                renderItem={({ item }) => (
                  <View style={styles.imageViewerPage}>
                    <Image source={{ uri: item }} style={styles.imageViewerImage} resizeMode="contain" />
                  </View>
                )}
              />
            </View>
          </Modal>
          <View style={styles.divider}/>
          {/* Availability and Price Row */}
          <View style={styles.priceAvailabilityRow}>
          <View style={styles.priceAvailabilityItem}>
          {
            Number(announcement.count || 0) > 0 && (
              <>
                <Text style={styles.priceAvailabilityLabel}>{t('addAnnouncement.quantity')}</Text>
              <Text style={styles.priceAvailabilityValue}>
              {Number(announcement.count || 0).toLocaleString()} {translateMeasureUnit(announcement.unit, i18n.language)}
            </Text>
              </>
            )
           }
              </View>
         
            <View style={styles.priceAvailabilityItem}>
              <Text style={styles.priceAvailabilityLabel}>{t('announcementDetail.price')}</Text>
              <Text style={styles.priceAvailabilityValue}>
                {Number(announcement.price || 0).toLocaleString()} {t('common.currency')}/{translateMeasureUnit((announcement as any).price_unit ?? announcement.unit, i18n.language)}
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
              <Text style={styles.limitValue}>{dailyLimit.toLocaleString()} {translateMeasureUnit(announcement.unit, i18n.language)}/{t('common.perDay')}</Text>
            </View>
          )}

          {/* Date Range */}
          {(startDate || endDate) && (
            <View style={styles.dateRow}>
              <Icon name="calendar" size={20} color={colors.textSecondary} />
              <Text style={styles.dateLabel}>{t('addAnnouncement.availabilityPeriod')}</Text>
              <Text style={styles.dateValue}>{formatDateRange(startDate, endDate)}</Text>
            </View>
          )}
          {/* Location Section */}
          {(regionNames.length > 0 || villageNames.length > 0) && (
            <View style={styles.locationSection}>
              <Text style={styles.locationTitle}>{t('addAnnouncement.transactionLocation')}</Text>
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
          // Announcer buttons: Edit (when pending), Close (Case 2c), Cancel (Cases 1, 2a, 2b, 2c)
          (showEdit || showClose || showCancel) && (
            <View style={styles.actionButtons}>
            
              {showClose && (
                closing ? (
                  <View style={styles.editButton}>
                    <ActivityIndicator size="small" color={colors.white} />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.editButton} onPress={handleClose}>
                    <Text style={styles.editButtonText}>{t('common.close')}</Text>
                  </TouchableOpacity>
                )
              )}
                {showCancel && (
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
                {showEdit && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    const parent = navigation.getParent()
                    const nav = parent ?? (navigation as any)
                    nav.navigate('NewAnnouncementForm', {
                      type: (announcement.category as 'goods' | 'service' | 'rent') || 'goods',
                      announcementId: announcement.id,
                      announcement,
                    })
                  }}
                >
                  <Text style={styles.editButtonText}>{t('common.edit')}</Text>
                </TouchableOpacity>
              )}
            
            </View>
          )
        ) : (
          // Applicant: optional pending notice + Contact / Apply
          (showContact || showApply || showPendingApplicationNotice) && (
            <View style={styles.applicantFooter}>
              {showPendingApplicationNotice && (
                <View
                  style={[
                    styles.pendingApplicationNotice,
                    !showContact && !showApply && styles.pendingApplicationNoticeSolo,
                  ]}
                >
                  <Text style={styles.pendingApplicationNoticeText}>
                    {t('announcementDetail.pendingApplicationNotice')}
                  </Text>
                </View>
              )}
              {(showContact || showApply) && (
                <View style={styles.applicantActionButtons}>
                  {showContact && (
                    <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
                      <Text style={styles.contactButtonText}>{t('announcementDetail.contact')}</Text>
                    </TouchableOpacity>
                  )}
                  {showApply && (
                    <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                      <Text style={styles.applyButtonText}>
                        {applyButtonIsReapply ? t('announcements.applyAgain') : t('announcements.apply')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )
        )}

        <ContactBottomSheet
          visible={contactModalVisible}
          onClose={() => setContactModalVisible(false)}
          title={t('profile.contactDetails')}
          displayName={announcement.owner?.full_name ?? '-'}
          roleLabel={t(`common.${ownerDisplayRoleKey}`)}
          avatarUri={(announcement.owner as any)?.profile_picture ?? (announcement.owner as any)?.profilePicture ?? null}
          rows={ownerContactSheetRows}
          phone={(announcement.owner?.phone || '').trim()}
          callButtonLabel={t('announcementDetail.call')}
          callFailedMessage={t('applications.callFailed')}
        />
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
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  imageViewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imageViewerTopBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  imageViewerCounter: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  imageViewerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  imageViewerPage: {
    width,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  imageViewerImage: {
    width: '100%',
    height: '75%',
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
    fontSize: 12,
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
  locationTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
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
  applicantFooter: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  pendingApplicationNotice: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    padding: 14,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pendingApplicationNoticeSolo: {
    marginBottom: 16,
  },
  pendingApplicationNoticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  applicantActionButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    gap: 12,
    backgroundColor: colors.white,
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
})
