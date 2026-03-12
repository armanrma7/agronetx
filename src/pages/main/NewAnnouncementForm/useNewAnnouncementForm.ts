import { useState, useEffect, useRef, useMemo } from 'react'
import { Alert, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { SupportedLang } from '../../../types/items'
import { AnnouncementType, Announcement } from '../../../types'
import * as announcementsAPI from '../../../lib/api/announcements.api'
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker'
import { API_CONFIG } from '../../../config/api.config'
import type { RouteParams, FormData, SelectOption } from './types'
import { INITIAL_FORM_DATA } from './types'

const MAX_IMAGES = 3
const MAX_FILE_SIZE = 5 * 1024 * 1024

function getCurrentLang(i18n: { language?: string }): SupportedLang {
  const lang = (i18n.language ?? 'hy').split('-')[0]
  if (lang === 'ru' || lang === 'en' || lang === 'hy') return lang
  return 'hy'
}

export function useNewAnnouncementForm() {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { type, announcementId, announcement: routeAnnouncement } = (route.params as RouteParams) || { type: 'goods' }
  const isEditMode = !!announcementId
  const currentLang = getCurrentLang(i18n)

  const [apiCategories, setApiCategories] = useState<announcementsAPI.APICategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [apiSubcategories, setApiSubcategories] = useState<announcementsAPI.APISubcategory[]>([])
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)
  const [measurementOptions, setMeasurementOptions] = useState<SelectOption[]>([])
  const [rentMeasurementOptions, setRentMeasurementOptions] = useState<SelectOption[]>([])

  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM_DATA, applicationType: type })
  const [additionalFieldsExpanded, setAdditionalFieldsExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentDateField, setCurrentDateField] = useState<'start' | 'end'>('start')
  const [tempDate, setTempDate] = useState(new Date())

  const [selectedImages, setSelectedImages] = useState<Asset[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedVillages, setSelectedVillages] = useState<string[]>([])

  const [editAnnouncementData, setEditAnnouncementData] = useState<any>(null)
  const [editItemId, setEditItemId] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editRentUnit, setEditRentUnit] = useState('')
  const previousGroupRef = useRef<string | undefined>(undefined)
  const didHydrateEditItemNameRef = useRef(false)
  const editPrefillAppliedRef = useRef(false)

  // Load announcement in edit mode
  useEffect(() => {
    if (!isEditMode || !announcementId) return

    const loadAnnouncement = (announcement: Announcement) => {
      const a = announcement as any
      const apiType = announcement.type || a.apiType || (a.subtype || 'sell')
      const category = announcement.category || type

      const mappedSubtype =
        category === 'goods'
          ? (apiType === 'sell' || apiType === 'buy' ? apiType : 'sell')
          : apiType === 'sell'
            ? 'offer'
            : apiType === 'buy'
              ? 'requirement'
              : 'offer'

      const itemIdStr = String(a.item_id ?? '')
      const rentUnitValue = (a.rent_unit || (category === 'rent' ? a.unit : '') || '') as string
      setEditAnnouncementData(a)
      setEditItemId(itemIdStr)
      setEditUnit(a.unit || '')
      setEditRentUnit(rentUnitValue)

      setFormData(prev => ({
        ...prev,
        applicationType: type,
        subtype: mappedSubtype,
        group: String(a.group_id ?? ''),
        name: itemIdStr || prev.name,
        quantity:
          typeof (a.count ?? a.available_quantity) === 'string'
            ? (a.count ?? a.available_quantity)
            : String(a.count ?? a.available_quantity ?? ''),
        pricePerUnit: typeof a.price === 'string' ? a.price : String(a.price ?? ''),
        dailyMaxQuantity: typeof a.daily_limit === 'string' ? a.daily_limit : String(a.daily_limit ?? ''),
        salesPeriod: a.date_to || '',
        periodStart: a.date_from || '',
        description: a.description || '',
        measurementUnit: a.unit ? String(a.unit) : prev.measurementUnit,
        rentUnit: category === 'rent' && rentUnitValue ? rentUnitValue : prev.rentUnit,
      }))

      if (a.regions && Array.isArray(a.regions)) setSelectedRegions(a.regions)
      if (a.villages && Array.isArray(a.villages)) setSelectedVillages(a.villages)

      const imagesArray = announcement.images || a.images || []
      if (imagesArray?.length > 0) {
        const imageAssets = imagesArray
          .filter((img: any) => {
            if (!img) return false
            if (typeof img === 'string') return img.trim() !== ''
            return !!(img.uri || img.url)
          })
          .map((img: any) => {
            let imageUri = typeof img === 'string' ? img.trim() : (img.uri || img.url || '').trim()
            if (imageUri && !/^https?:\/\//.test(imageUri) && !imageUri.startsWith('file://')) {
              const base = API_CONFIG.baseURL
              imageUri = imageUri.startsWith('/') ? `${base}${imageUri.slice(1)}` : `${base}${imageUri}`
            }
            return {
              uri: imageUri,
              type: (typeof img === 'object' && img.type) ? img.type : 'image/jpeg',
              fileName: (typeof img === 'object' && img.fileName) ? img.fileName : (imageUri.split('/').pop() || 'image.jpg'),
            } as Asset
          })
          .filter((a: Asset) => a.uri?.trim()) as Asset[]
        setSelectedImages(imageAssets.length > 0 ? imageAssets : [])
      } else {
        setSelectedImages([])
      }

      editPrefillAppliedRef.current = true
    }

    if (routeAnnouncement) {
      loadAnnouncement(routeAnnouncement)
    } else {
      announcementsAPI
        .getAnnouncementByIdAPI(announcementId)
        .then(loadAnnouncement)
        .catch(() => Alert.alert(t('common.error'), 'Failed to load announcement'))
    }
  }, [isEditMode, announcementId, routeAnnouncement, type])

  // Set item name when subcategories loaded (edit mode)
  useEffect(() => {
    if (didHydrateEditItemNameRef.current) return
    if (isEditMode && editItemId && apiSubcategories.length > 0) {
      const exists = apiSubcategories.some(sub =>
        sub.items?.some(item => String(item.id) === String(editItemId))
      )
      if (exists && formData.name !== editItemId) {
        setFormData(prev => ({ ...prev, name: editItemId }))
      }
      if (exists) didHydrateEditItemNameRef.current = true
    }
  }, [isEditMode, editItemId, apiSubcategories, formData.name])

  // Fetch categories on mount/type change
  useEffect(() => {
    let cancelled = false
    setLoadingCategories(true)
    announcementsAPI
      .getCategoriesByTypeAPI(type)
      .then(data => { if (!cancelled) setApiCategories(data) })
      .catch(() => { if (!cancelled) setApiCategories([]) })
      .finally(() => { if (!cancelled) setLoadingCategories(false) })
    return () => { cancelled = true }
  }, [type])

  useEffect(() => {
    if (formData.group) {
      const prev = previousGroupRef.current
      if (prev !== undefined && prev !== formData.group) {
        setFormData(prevState => ({ ...prevState, name: '', measurementUnit: '', rentUnit: '' }))
      }
      previousGroupRef.current = formData.group
      setLoadingSubcategories(true)
      announcementsAPI
        .getSubcategoriesByCategoryIdAPI(formData.group)
        .then(data => setApiSubcategories(data))
        .catch(() => setApiSubcategories([]))
        .finally(() => setLoadingSubcategories(false))
    } else {
      previousGroupRef.current = undefined
      setApiSubcategories([])
      setFormData(prev => ({ ...prev, name: '', measurementUnit: '', rentUnit: '' }))
    }
  }, [formData.group, isEditMode])

  const [formHydrated, setFormHydrated] = useState(!isEditMode)
  const formHydratedRef = useRef(!isEditMode) // prevents calling setFormHydrated more than once

  useEffect(() => {
    if (!formData.name) {
      setMeasurementOptions([])
      setRentMeasurementOptions([])
      if (!isEditMode) setFormData(prev => ({ ...prev, measurementUnit: '', rentUnit: '' }))
      return
    }

    const nameStr = String(formData.name)
    let selectedItem: announcementsAPI.APIItem | null = null
    for (const sub of apiSubcategories) {
      const item = sub.items?.find(i => String(i.id) === nameStr)
      if (item) {
        selectedItem = item
        break
      }
    }

    if (selectedItem?.measurements?.length) {
      let options = selectedItem.measurements.map(m => {
        const label = currentLang === 'hy' ? m.hy : currentLang === 'ru' ? m.ru : m.en
        return { value: m.en, label }
      })
      if (isEditMode && editUnit) {
        const match = options.find(o =>
          o.value.toLowerCase() === editUnit.toLowerCase().trim() || o.label.toLowerCase() === editUnit.toLowerCase().trim()
        )
        if (!match) options = [{ value: editUnit, label: editUnit }, ...options]
      }
      setMeasurementOptions(options)
      if (isEditMode && editUnit) {
        const match = options.find(o =>
          o.value.toLowerCase() === editUnit.toLowerCase().trim() || o.label.toLowerCase() === editUnit.toLowerCase().trim()
        )
        setFormData(prev => ({ ...prev, measurementUnit: match ? match.value : editUnit }))
      } else if (!isEditMode) {
        setFormData(prev => ({ ...prev, measurementUnit: '' }))
      }
    } else {
      if (isEditMode && editUnit) {
        setMeasurementOptions([{ value: editUnit, label: editUnit }])
        setFormData(prev => ({ ...prev, measurementUnit: editUnit }))
      } else {
        setMeasurementOptions([])
        if (!isEditMode) setFormData(prev => ({ ...prev, measurementUnit: '' }))
      }
    }

    const rentMeas = (selectedItem as any)?.rent_measurements
    if (rentMeas?.length) {
      let rentOptions = rentMeas.map((m: { en: string; hy: string; ru: string }) => {
        const label = currentLang === 'hy' ? m.hy : currentLang === 'ru' ? m.ru : m.en
        return { value: m.en, label }
      })
      if (isEditMode && editRentUnit) {
        const match = rentOptions.find(
          (o: SelectOption) =>
            o.value.toLowerCase() === editRentUnit.toLowerCase().trim() ||
            o.label.toLowerCase() === editRentUnit.toLowerCase().trim()
        )
        if (!match) rentOptions = [{ value: editRentUnit, label: editRentUnit }, ...rentOptions]
      }
      setRentMeasurementOptions(rentOptions)
      if (isEditMode && editRentUnit) {
        const match = rentOptions.find(
          (o: SelectOption) =>
            o.value.toLowerCase() === editRentUnit.toLowerCase().trim() ||
            o.label.toLowerCase() === editRentUnit.toLowerCase().trim()
        )
        setFormData(prev => ({ ...prev, rentUnit: match ? match.value : editRentUnit }))
      } else if (!isEditMode) {
        setFormData(prev => ({ ...prev, rentUnit: '' }))
      }
    } else {
      if (isEditMode && type === 'rent' && editRentUnit) {
        setRentMeasurementOptions([{ value: editRentUnit, label: editRentUnit }])
        setFormData(prev => ({ ...prev, rentUnit: editRentUnit }))
      } else {
        setRentMeasurementOptions([])
        if (!isEditMode) setFormData(prev => ({ ...prev, rentUnit: '' }))
      }
    }

    // Signal that the form is fully hydrated.
    // This is batched with the setFormData calls above into a single render,
    // so currentSnapshot will already contain the correct measurementUnit /
    // rentUnit when the snapshot-init effect runs.
    if (isEditMode && !formHydratedRef.current) {
      formHydratedRef.current = true
      setFormHydrated(true)
    }
  }, [formData.name, apiSubcategories, currentLang, isEditMode, editUnit, editRentUnit, type])

  const catalogLang: announcementsAPI.CatalogLang = currentLang === 'ru' || currentLang === 'en' ? currentLang : 'hy'
  const categoryOptions = apiCategories.map(cat => ({
    value: String(cat.id),
    label: announcementsAPI.getCategoryLabelByLang(cat, catalogLang),
  }))
  const subcategoryOptions = apiSubcategories.flatMap(sub => {
    if (!sub.items?.length) return []
    const subLabel = announcementsAPI.getSubcategoryLabelByLang(sub, catalogLang)
    return [
      { value: `header_${sub.id}`, label: subLabel, isHeader: true },
      ...sub.items.map((item: announcementsAPI.APIItem) => ({
        value: String(item.id),
        label: announcementsAPI.getItemLabelByLang(item, catalogLang),
        isHeader: false,
      })),
    ]
  })

  const getSubtypeOptions = (): SelectOption[] => {
    const category = isEditMode && editAnnouncementData?.category ? editAnnouncementData.category : type
    switch (category) {
      case 'goods':
        return [
          { value: 'sell', label: t('announcementSubtype.sellGoods') },
          { value: 'buy', label: t('announcementSubtype.buyGoods') },
        ]
      case 'service':
        return [
          { value: 'offer', label: t('announcementSubtype.serviceOffer') },
          { value: 'requirement', label: t('announcementSubtype.serviceRequirement') },
        ]
      case 'rent':
        return [
          { value: 'offer', label: t('announcementSubtype.rentOffer') },
          { value: 'requirement', label: t('announcementSubtype.rentRequirement') },
        ]
      default:
        return []
    }
  }

  const requiredFieldMessage = (fieldLabel: string): string => {
    const lang = getCurrentLang(i18n)
    if (lang === 'hy') {
      return `«${fieldLabel} դաշտը պարտադիր է։»`
    }
    if (lang === 'ru') {
      return `«Поле "${fieldLabel}" является обязательным.»`
    }
    return `"The ${fieldLabel} field is required."`
  }

  const validateForm = (): boolean => {
    const requiredFields: Array<{ ok: boolean; label: string }> = [
      { ok: !!formData.subtype, label: t('announcementSubtype.title') },
      { ok: !!formData.group, label: t('addAnnouncement.group') },
      { ok: !!formData.name, label: t('addAnnouncement.name') },
      { ok: type === 'rent' ? true : !!formData.measurementUnit, label: t('addAnnouncement.unitOfMeasurement') },
      { ok: type === 'rent' && rentMeasurementOptions.length > 0 ? !!formData.rentUnit : true, label: t('addAnnouncement.rentUnit') },
      { ok: type === 'goods' ? !!formData.quantity : true, label: t('addAnnouncement.quantity') },
      { ok: !!formData.pricePerUnit, label: t('addAnnouncement.price') },
    ]

    const firstMissing = requiredFields.find(f => !f.ok)
    if (firstMissing) {
      Alert.alert('', requiredFieldMessage(firstMissing.label))
      return false
    }
    return true
  }

  const isValidForSubmit = useMemo(() => {
    const requiredFields: Array<{ ok: boolean }> = [
      { ok: !!formData.subtype },
      { ok: !!formData.group },
      { ok: !!formData.name },
      { ok: type === 'rent' ? true : !!formData.measurementUnit },
      { ok: type === 'rent' && rentMeasurementOptions.length > 0 ? !!formData.rentUnit : true },
      { ok: type === 'goods' ? !!formData.quantity : true },
      { ok: !!formData.pricePerUnit },
    ]
    return requiredFields.every(f => f.ok)
  }, [
    formData.subtype,
    formData.group,
    formData.name,
    formData.measurementUnit,
    formData.rentUnit,
    formData.quantity,
    formData.pricePerUnit,
    type,
    rentMeasurementOptions.length,
  ])

  const initialSnapshotRef = useRef<string | null>(null)
  const didInitSnapshotRef = useRef(false)
  const skipUnsavedPromptRef = useRef(false)

  const currentSnapshot = useMemo(() => {
    const snap = {
      type,
      subtype: formData.subtype ?? '',
      group: formData.group ?? '',
      name: formData.name ?? '',
      measurementUnit: formData.measurementUnit ?? '',
      rentUnit: formData.rentUnit ?? '',
      quantity: formData.quantity ?? '',
      pricePerUnit: formData.pricePerUnit ?? '',
      description: formData.description ?? '',
      dailyMaxQuantity: formData.dailyMaxQuantity ?? '',
      periodStart: formData.periodStart ?? '',
      salesPeriod: formData.salesPeriod ?? '',
      regions: selectedRegions,
      villages: selectedVillages,
      images: selectedImages.map(i => i.uri ?? ''),
    }
    return JSON.stringify(snap)
  }, [
    type,
    formData.subtype,
    formData.group,
    formData.name,
    formData.measurementUnit,
    formData.rentUnit,
    formData.quantity,
    formData.pricePerUnit,
    formData.description,
    formData.dailyMaxQuantity,
    formData.periodStart,
    formData.salesPeriod,
    selectedRegions,
    selectedVillages,
    selectedImages,
  ])

  // Capture the initial snapshot only once, and only after the form is fully
  // hydrated (i.e. after the measurement effect has run and applied its
  // setFormData).  Using formHydrated (instead of !loadingSubcategories) as
  // the gate ensures we wait for the last setFormData call, not just for the
  // network request to finish.
  useEffect(() => {
    if (didInitSnapshotRef.current) return

    if (!isEditMode) {
      initialSnapshotRef.current = currentSnapshot
      didInitSnapshotRef.current = true
      return
    }

    if (isEditMode && editPrefillAppliedRef.current && formHydrated) {
      initialSnapshotRef.current = currentSnapshot
      didInitSnapshotRef.current = true
    }
  }, [currentSnapshot, isEditMode, formHydrated])

  const isDirty = useMemo(() => {
    if (!didInitSnapshotRef.current) return false
    return initialSnapshotRef.current !== currentSnapshot
  }, [currentSnapshot])

  const canSubmit = isEditMode ? isDirty && isValidForSubmit : isValidForSubmit

  const handlePublish = async () => {
    if (!validateForm()) return
    try {
      setUpdating(true)
      let apiType = formData.subtype
      if (type === 'service' || type === 'rent') {
        if (formData.subtype === 'offer') apiType = 'sell'
        else if (formData.subtype === 'requirement') apiType = 'buy'
      }
      const payload: any = {
        type: apiType,
        category: type,
        group_id: formData.group,
        item_id: formData.name,
        price: parseFloat(formData.pricePerUnit),
        unit: type === 'rent' ? (formData.measurementUnit || formData.rentUnit || '') : formData.measurementUnit,
      }
      if (type === 'rent' && formData.rentUnit) payload.rent_unit = formData.rentUnit
      if (formData.description) payload.description = formData.description
      if (type === 'goods' && formData.quantity) payload.count = parseFloat(formData.quantity)
      if (type === 'goods' && formData.dailyMaxQuantity) payload.daily_limit = parseFloat(formData.dailyMaxQuantity)
      if (formData.periodStart) payload.date_from = formData.periodStart
      if (formData.salesPeriod) payload.date_to = formData.salesPeriod
      if (selectedRegions.length) payload.regions = selectedRegions
      if (selectedVillages.length) payload.villages = selectedVillages

      const validImages = selectedImages.filter(img => img.uri)
      if (isEditMode && announcementId) {
        const existingUrls = validImages
          .filter(img => img.uri && (img.uri.startsWith('http://') || img.uri.startsWith('https://')))
          .map(img => img.uri!)
        const newFiles = validImages.filter(img => img.uri?.startsWith('file://') || img.uri?.startsWith('content://'))
        payload.images = existingUrls as any
        await announcementsAPI.updateAnnouncementAPI(announcementId, payload, newFiles.length ? newFiles : undefined)
        Alert.alert("", t('addAnnouncement.updateSuccess'), [{ text: t('common.ok'), onPress: () => { skipUnsavedPromptRef.current = true; navigation.goBack() } }])
      } else {
        await announcementsAPI.createAnnouncementAPI(payload, validImages.length ? validImages : undefined)
        Alert.alert("", t('addAnnouncement.createSuccess'), [{ text: t('common.ok'), onPress: () => { skipUnsavedPromptRef.current = true; navigation.goBack() } }])
      }
    } catch (error: any) {
      Alert.alert(
        "",
        error.response?.data?.message || error.message || (isEditMode ? t('addAnnouncement.updateError') : t('addAnnouncement.publishError'))
      )
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const openDatePicker = (field: 'start' | 'end') => {
    setCurrentDateField(field)
    const existing = field === 'start' ? formData.periodStart : formData.salesPeriod
    setTempDate(existing ? new Date(existing) : new Date())
    setShowDatePicker(true)
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
      if (event.type === 'set' && selectedDate) confirmDate(selectedDate)
    } else if (selectedDate) {
      setTempDate(selectedDate)
    }
  }

  const confirmDate = (dateToConfirm?: Date) => {
    const d = dateToConfirm || tempDate
    const str = formatDate(d)
    if (currentDateField === 'start') setFormData(prev => ({ ...prev, periodStart: str }))
    else setFormData(prev => ({ ...prev, salesPeriod: str }))
    setShowDatePicker(false)
  }

  const validateImage = (asset: Asset): boolean => {
    if (!asset.fileSize) return false
    if (asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert(t('common.error'), t('addAnnouncement.fileSizeExceedsLimit'))
      return false
    }
    const uri = (asset.uri || '').toLowerCase()
    if (!/\.(jpg|jpeg|png|webp)$/.test(uri)) {
      Alert.alert(t('common.error'), t('addAnnouncement.onlyJPEGPNGWebPAllowed'))
      return false
    }
    return true
  }

  const showImagePickerOptions = () => {
    Alert.alert(t('addAnnouncement.images'), t('addAnnouncement.uploadImagesInfo'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: 'Camera', onPress: openCamera },
      { text: 'Gallery', onPress: openGallery },
    ])
  }

  const openCamera = () => {
    if (selectedImages.length >= MAX_IMAGES) {
      Alert.alert(t('common.error'), t('addAnnouncement.maximumImagesAllowed', { count: MAX_IMAGES }))
      return
    }
    launchCamera({ mediaType: 'photo', quality: 0.8, maxWidth: 1920, maxHeight: 1920 }, res => {
      if (res.didCancel || res.errorCode) return
      const asset = res.assets?.[0]
      if (asset && validateImage(asset)) setSelectedImages(prev => [...prev, asset])
    })
  }

  const openGallery = () => {
    const remaining = MAX_IMAGES - selectedImages.length
    if (remaining <= 0) {
      Alert.alert("", t('addAnnouncement.maximumImagesAllowed', { count: MAX_IMAGES }))
      return
    }
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, maxWidth: 1920, maxHeight: 1920, selectionLimit: remaining },
      res => {
        if (res.didCancel || res.errorCode) return
        const valid = (res.assets || []).filter(validateImage)
        if (valid.length) setSelectedImages(prev => [...prev, ...valid])
      }
    )
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const showUnitField = type !== 'rent' || measurementOptions.length > 0 || (isEditMode && type === 'rent')
  const showRentUnitField = rentMeasurementOptions.length > 0 || (isEditMode && type === 'rent' && !!formData.rentUnit)

  return {
    t,
    type,
    isEditMode,
    currentLang,
    formData,
    setFormData,
    categoryOptions,
    subcategoryOptions,
    measurementOptions,
    rentMeasurementOptions,
    subtypeOptions: getSubtypeOptions(),
    loadingCategories,
    loadingSubcategories,
    additionalFieldsExpanded,
    setAdditionalFieldsExpanded,
    updating,
    selectedImages,
    selectedRegions,
    setSelectedRegions,
    selectedVillages,
    setSelectedVillages,
    showDatePicker,
    setShowDatePicker,
    currentDateField,
    tempDate,
    openDatePicker,
    handleDateChange,
    confirmDate,
    cancelDatePicker: () => setShowDatePicker(false),
    showImagePickerOptions,
    removeImage,
    handlePublish,
    canSubmit,
    isDirty,
    skipUnsavedPromptRef,
    navigation,
    showUnitField,
    showRentUnitField,
    MAX_IMAGES,
  }
}