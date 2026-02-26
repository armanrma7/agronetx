/**
 * Announcements API
 * Handles announcements-related API calls
 */

import apiClient from './client'
import type { Announcement, Owner, Group, Item, RegionVillage, ClosedByUser, AnnouncementApplication } from '../../types'

// API Category interface (name_am = Armenian, used for current language display)
export interface APICategory {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_am?: string
  name_ru?: string
  type: string
}

// API Item interface (name_am = Armenian, for current language display)
export interface APIItem {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_am?: string
  name_ru?: string
  subcategory_id: string
  measurements?: Array<{
    en: string
    hy: string
    ru: string
  }>
}

// API Subcategory interface (name_am = Armenian, used for current language display)
export interface APISubcategory {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_am?: string
  name_ru?: string
  category_id: string
  items?: APIItem[]
}

/** Shared label by lang - use for group/category and sub-group/subcategory in FilterModal and NewAnnouncementFormPage */
export type CatalogLang = 'hy' | 'ru' | 'en'

export function getCategoryLabelByLang(c: APICategory, lang: CatalogLang): string {
  return (lang === 'hy' && (c.name_hy ?? c.name_am ?? c.name)) ||
    (lang === 'ru' && (c.name_ru ?? c.name)) ||
    (c.name_en ?? c.name) ||
    ''
}

export function getSubcategoryLabelByLang(s: APISubcategory, lang: CatalogLang): string {
  return (lang === 'hy' && (s.name_hy ?? s.name_am ?? s.name)) ||
    (lang === 'ru' && (s.name_ru ?? s.name)) ||
    (s.name_en ?? s.name) ||
    ''
}

export function getItemLabelByLang(item: APIItem, lang: CatalogLang): string {
  return (lang === 'hy' && (item.name_hy ?? item.name_am ?? item.name)) ||
    (lang === 'ru' && (item.name_ru ?? item.name)) ||
    (item.name_en ?? item.name) ||
    ''
}

export interface GetAnnouncementsParams {
  /** Filter by category — repeat for multiple (e.g. category=goods&category=service) */
  category?: ('goods' | 'service' | 'rent') | ('goods' | 'service' | 'rent')[]
  type?: 'sell' | 'buy'
  /** Filter by group — GoodsCategory UUID(s); repeat for multiple */
  group_id?: string[]
  /** Filter by subgroup — GoodsSubcategory UUID(s); repeat for multiple */
  subgroup_id?: string[]
  /** Filter by item — GoodsItem UUID(s); repeat for multiple */
  item_id?: string[]
  status?: 'active' | 'completed' | 'cancelled' | 'published'
  region?: string[]
  village?: string[]
  created_from?: string
  created_to?: string
  price_from?: string
  price_to?: string
  limit?: number
  offset?: number
  page?: number
  signal?: AbortSignal
}

/**
 * Parse API string number to number (e.g. "1231.00" -> 1231)
 */
function toNum(v: any): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const n = parseFloat(String(v))
  return Number.isNaN(n) ? 0 : n
}

function toStr(v: any): string {
  if (v == null || v === '') return ''
  return String(v)
}

function toRegionVillage(r: any): RegionVillage {
  if (!r) return { id: '', name_am: '', name_en: '', name_ru: '' }
  return {
    id: r.id ?? '',
    name_am: r.name_am ?? r.name_hy ?? r.name ?? '',
    name_en: r.name_en ?? r.name ?? '',
    name_ru: r.name_ru ?? r.name ?? '',
  }
}

/**
 * Map server response from GET /announcements/{id} to Announcement interface.
 * API shape: owner_id, owner{id, full_name}, type (sell/buy/rent), category (goods/service/rent),
 * item{name_am, name_en, name_ru}, group{name_am, name_en, name_ru}, applications[{ applicant_id, applicant{id, full_name}, status, ... }],
 * regions_data, villages_data, price/count as strings, etc.
 */
function mapAnnouncementResponse(data: any): Announcement {
  const apiType = data.type || data.subtype || data.sub_type // sell/buy/rent
  const category = data.category || (data.type === 'rent' ? 'rent' : data.type === 'sell' || data.type === 'buy' ? 'goods' : 'goods')

  // Owner: API uses owner_id + owner{ id, full_name }
  const ownerId = data.owner_id ?? data.owner?.id ?? data.user_id ?? data.userId ?? ''
  const owner = data.owner || data.user
  const fullName = owner?.full_name ?? (owner ? [owner.name, owner.surname].filter(Boolean).join(' ') : '') ?? ''
  const [ownerName, ...surnameParts] = fullName.trim().split(/\s+/)
  const ownerSurname = surnameParts.length ? surnameParts.join(' ') : ''

  // Item title and translated names: API uses item{ name_am, name_en, name_ru }
  const item = data.item || {}
  const itemNameAm = item.name_am ?? item.name_hy ?? data.name_am ?? data.name_hy ?? ''
  const itemNameEn = item.name_en ?? data.name_en ?? ''
  const itemNameRu = item.name_ru ?? data.name_ru ?? ''
  const title = data.title ?? itemNameAm ?? itemNameEn ?? itemNameRu ?? item.name ?? ''

  // Applications: API uses applicant_id and applicant{ id, full_name }
  const applications = Array.isArray(data.applications)
    ? data.applications.map((app: any) => {
        const applicantId = app.applicant_id ?? app.applicant?.id ?? app.user_id ?? app.userId ?? ''
        const applicant = app.applicant || app.user
        const appFullName = applicant?.full_name ?? (applicant ? [applicant.name, applicant.surname].filter(Boolean).join(' ') : '') ?? ''
        const [appName, ...appSurnameParts] = appFullName.trim().split(/\s+/)
        return {
          id: app.id || '',
          announcement_id: app.announcement_id ?? app.announcementId ?? data.id ?? '',
          user_id: applicantId,
          userId: applicantId,
          count: app.count ?? app.quantity,
          delivery_dates: Array.isArray(app.delivery_dates) ? app.delivery_dates : app.delivery_dates ? [app.delivery_dates] : [],
          unit: app.unit,
          notes: app.notes,
          status: app.status ?? 'pending',
          created_at: app.created_at ?? app.createdAt,
          updated_at: app.updated_at ?? app.updatedAt,
          user: applicant ? { name: appName || '', surname: appSurnameParts.join(' ') || '' } : undefined,
        }
      })
    : []

  const applicationsCount = data.applications_count ?? data.applicationsCount ?? (Array.isArray(data.applications) ? data.applications.length : 0)
  const regionsDataRaw = Array.isArray(data.regions_data) ? data.regions_data : data.regions_data ? [data.regions_data] : []
  const villagesDataRaw = Array.isArray(data.villages_data) ? data.villages_data : data.villages_data ? [data.villages_data] : []
  const regionsData: RegionVillage[] = regionsDataRaw.map((r: any) => toRegionVillage(r))
  const villagesData: RegionVillage[] = villagesDataRaw.map((v: any) => toRegionVillage(v))

  const ownerRegion = toRegionVillage(owner?.region ?? data.owner_region)
  const ownerVillage = toRegionVillage(owner?.village ?? data.owner_village)
  const mappedOwner: Owner = {
    id: ownerId,
    full_name: (owner?.full_name ?? [ownerName, ownerSurname].filter(Boolean).join(' ')) || '',
    phone: owner?.phone ?? '',
    region_id: owner?.region_id ?? owner?.region?.id ?? '',
    village_id: owner?.village_id ?? owner?.village?.id ?? '',
    region: ownerRegion,
    village: ownerVillage,
  }

  const groupData = data.group || {}
  const mappedGroup: Group = {
    id: groupData.id ?? data.group_id ?? '',
    name_am: groupData.name_am ?? groupData.name_hy ?? groupData.name ?? '',
    name_en: groupData.name_en ?? groupData.name ?? '',
    name_ru: groupData.name_ru ?? groupData.name ?? '',
  }

  const measurements = Array.isArray(item.measurements) ? item.measurements.map((m: any) => ({
    en: m.en ?? m.name_en ?? '',
    hy: m.hy ?? m.name_hy ?? m.name_am ?? '',
    ru: m.ru ?? m.name_ru ?? '',
  })) : []
  const mappedItem: Item = {
    id: item.id ?? data.item_id ?? '',
    name_am: (itemNameAm || item.name) ?? '',
    name_en: (itemNameEn || item.name) ?? '',
    name_ru: (itemNameRu || item.name) ?? '',
    measurements,
  }

  const closedBy = data.closed_by_user ?? data.closedByUser ?? null
  const mappedClosedByUser: ClosedByUser | null = closedBy ? {
    id: closedBy.id ?? '',
    full_name: closedBy.full_name ?? '',
  } : null

  return {
    id: data.id || '',
    type: (apiType === 'sell' || apiType === 'buy' ? apiType : data.type) || 'sell',
    category,
    group_id: data.group_id ?? groupData.id ?? '',
    item_id: data.item_id ?? item.id ?? '',
    price: toStr(data.price),
    description: toStr(data.description),
    owner_id: ownerId,
    status: data.status || 'published',
    closed_by: data.closed_by ?? null,
    count: toStr(data.count ?? data.quantity),
    daily_limit: toStr(data.daily_limit),
    available_quantity: toStr(data.available_quantity ?? data.quantity ?? data.count),
    unit: toStr(data.quantity_unit ?? data.quantityUnit ?? data.unit),
    images: Array.isArray(data.images) ? data.images : data.images ? [data.images] : [],
    date_from: data.date_from ?? data.dateFrom ?? null,
    date_to: data.date_to ?? data.dateTo ?? data.expires_at ?? data.expiresAt ?? null,
    min_area: data.min_area != null ? toNum(data.min_area) : null,
    regions: Array.isArray(data.regions) ? data.regions : data.regions ? [data.regions] : [],
    villages: Array.isArray(data.villages) ? data.villages : data.villages ? [data.villages] : [],
    views_count: toNum(data.views_count ?? data.viewsCount),
    created_at: data.created_at ?? data.createdAt ?? new Date().toISOString(),
    updated_at: data.updated_at ?? data.updatedAt ?? new Date().toISOString(),
    owner: mappedOwner,
    group: mappedGroup,
    item: mappedItem,
    closedByUser: mappedClosedByUser,
    regions_data: regionsData,
    villages_data: villagesData,
    applications_count: applicationsCount,
    applications: applications as AnnouncementApplication[],
    // Legacy/extra for UI (cast where needed)
    ...({
      title: data.title ?? itemNameAm ?? itemNameEn ?? itemNameRu ?? item.name ?? '',
      price_unit: data.price_unit ?? data.priceUnit ?? data.unit ?? 'դր',
      owner_region_name: ownerRegion.name_am || ownerRegion.name_en || ownerRegion.name_ru || '',
      owner_village_name: ownerVillage.name_am || ownerVillage.name_en || ownerVillage.name_ru || '',
      subtype: apiType,
      item_name: itemNameAm || itemNameEn || itemNameRu || item.name,
      name_en: itemNameEn,
      name_ru: itemNameRu,
      name_hy: itemNameAm,
      name_am: itemNameAm,
      region_names: data.region_names ?? regionsData.map(r => r.name_en || r.name_am),
      village_names: data.village_names ?? villagesData.map(v => v.name_en || v.name_am),
      my_applications_count: data.my_applications_count ?? data.myApplicationsCount,
    } as any),
  } as Announcement
}

/**
 * Get announcements with optional filters and pagination
 */
export async function getAnnouncementsAPI(params?: GetAnnouncementsParams): Promise<PaginatedResponse<Announcement>> {
  // Build query params, handling arrays for region and village
  const queryParams: any = {}
  
  if (params) {
    // Handle simple params
    if (params.type) queryParams.type = params.type
    if (params.status) queryParams.status = params.status
    // Category: single or array (repeat for multiple)
    if (params.category !== undefined) {
      queryParams.category = Array.isArray(params.category) ? params.category : [params.category]
    }
    // group_id and subgroup_id: arrays, repeat for multiple
    if (params.group_id && params.group_id.length > 0) {
      queryParams.group_id = params.group_id
    }
    if (params.subgroup_id && params.subgroup_id.length > 0) {
      queryParams.subgroup_id = params.subgroup_id
    }
    if (params.item_id && params.item_id.length > 0) {
      queryParams.item_id = params.item_id
    }
    if (params.created_from) queryParams.created_from = params.created_from
    if (params.created_to) queryParams.created_to = params.created_to
    if (params.price_from) queryParams.price_from = params.price_from
    if (params.price_to) queryParams.price_to = params.price_to
    if (params.limit !== undefined) queryParams.limit = params.limit
    if (params.offset !== undefined) queryParams.offset = params.offset
    if (params.page !== undefined) queryParams.page = params.page
    
    // Handle array params (region and village) - axios will serialize them as region=uuid1&region=uuid2
    if (params.region && params.region.length > 0) {
      queryParams.region = params.region
    }
    if (params.village && params.village.length > 0) {
      queryParams.village = params.village
    }
  }
  
  // Serialize array params manually to format: region=uuid1&region=uuid2
  let queryString = ''
  const queryParts: string[] = []
  
  Object.keys(queryParams).forEach(key => {
    const value = queryParams[key]
    if (Array.isArray(value)) {
      // For arrays, add each value as a separate param
      value.forEach(item => {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
      })
    } else if (value !== undefined && value !== null && value !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  })
  
  queryString = queryParts.join('&')
  
  const response = await apiClient.get<any>(`/announcements${queryString ? `?${queryString}` : ''}`, {
    signal: params?.signal,
  })
  
  // Handle paginated response structure
  if (response.data?.announcements && Array.isArray(response.data.announcements)) {
    const announcementsData: Announcement[] = response.data.announcements.map((item: any) => mapAnnouncementResponse(item))
    return {
      announcements: announcementsData,
      total: response.data.total || announcementsData.length,
      page: response.data.page || 1,
      limit: response.data.limit || announcementsData.length,
    }
  }
  
  // Fallback: Handle different response structures for backward compatibility
  let announcementsData: any[] = []
  if (Array.isArray(response.data)) {
    announcementsData = response.data
  } else if (response.data?.data && Array.isArray(response.data.data)) {
    announcementsData = response.data.data
  } else if (response.data?.results && Array.isArray(response.data.results)) {
    announcementsData = response.data.results
  } else if (response.data?.items && Array.isArray(response.data.items)) {
    announcementsData = response.data.items
  }
  
  const announcements: Announcement[] = announcementsData.map((item: any) => mapAnnouncementResponse(item))
  
  // Return paginated structure (for backward compatibility, assume all items are on page 1)
  return {
    announcements,
    total: announcements.length,
    page: 1,
    limit: announcements.length,
  }
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  announcements: T[]
  total: number
  page: number
  limit: number
}

/**
 * Get current user's announcements with pagination
 */
export interface GetMyAnnouncementsParams {
  page?: number
  limit?: number
  signal?: AbortSignal // AbortSignal for request cancellation
}

export async function getMyAnnouncementsAPI(params?: GetMyAnnouncementsParams): Promise<PaginatedResponse<Announcement>> {
  const queryParams: any = {}
  if (params?.page) queryParams.page = params.page
  if (params?.limit) queryParams.limit = params.limit
  
  const queryString = Object.keys(queryParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&')
  
  const response = await apiClient.get<any>(`/announcements/me${queryString ? `?${queryString}` : ''}`, {
    signal: params?.signal,
  })
  
  // Handle paginated response structure
  if (response.data?.announcements && Array.isArray(response.data.announcements)) {
    const announcementsData = response.data.announcements.map((item: any) => mapAnnouncementResponse(item))
    return {
      announcements: announcementsData,
      total: response.data.total || announcementsData.length,
      page: response.data.page || 1,
      limit: response.data.limit || announcementsData.length,
    }
  }
  
  // Fallback: Handle different response structures for backward compatibility
  let announcementsData: any[] = []
  if (Array.isArray(response.data)) {
    announcementsData = response.data
  } else if (response.data?.data && Array.isArray(response.data.data)) {
    announcementsData = response.data.data
  } else if (response.data?.results && Array.isArray(response.data.results)) {
    announcementsData = response.data.results
  } else if (response.data?.items && Array.isArray(response.data.items)) {
    announcementsData = response.data.items
  }
  
  // Map announcements to our format
  const announcements: Announcement[] = announcementsData.map((item: any) => mapAnnouncementResponse(item))
  
  // Return paginated structure (for backward compatibility, assume all items are on page 1)
  return {
    announcements,
    total: announcements.length,
    page: 1,
    limit: announcements.length,
  }
}

/**
 * Get announcements that the current user has applied to with pagination
 */
export interface GetAppliedAnnouncementsParams {
  page?: number
  limit?: number
  signal?: AbortSignal // AbortSignal for request cancellation
}

export async function getAppliedAnnouncementsAPI(params?: GetAppliedAnnouncementsParams): Promise<PaginatedResponse<Announcement>> {
  const queryParams: any = {}
  if (params?.page) queryParams.page = params.page
  if (params?.limit) queryParams.limit = params.limit
  
  const queryString = Object.keys(queryParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&')
  
  const response = await apiClient.get<any>(`/announcements/applied${queryString ? `?${queryString}` : ''}`, {
    signal: params?.signal,
  })
  
  // Handle paginated response structure
  if (response.data?.announcements && Array.isArray(response.data.announcements)) {
    const announcementsData: Announcement[] = response.data.announcements.map((item: any) => mapAnnouncementResponse(item))
    return {
      announcements: announcementsData,
      total: response.data.total || announcementsData.length,
      page: response.data.page || 1,
      limit: response.data.limit || announcementsData.length,
    }
  }
  
  // Fallback: Handle different response structures for backward compatibility
  let announcementsData: any[] = []
  if (Array.isArray(response.data)) {
    announcementsData = response.data
  } else if (response.data?.data && Array.isArray(response.data.data)) {
    announcementsData = response.data.data
  } else if (response.data?.results && Array.isArray(response.data.results)) {
    announcementsData = response.data.results
  } else if (response.data?.items && Array.isArray(response.data.items)) {
    announcementsData = response.data.items
  }
  
  const announcements: Announcement[] = announcementsData.map((item: any) => mapAnnouncementResponse(item))
  
  // Return paginated structure (for backward compatibility, assume all items are on page 1)
  return {
    announcements,
    total: announcements.length,
    page: 1,
    limit: announcements.length,
  }
}

/**
 * Get announcement by ID
 */
export async function getAnnouncementByIdAPI(id: string): Promise<Announcement> {
  const response = await apiClient.get<any>(`/announcements/${id}`)
  
  
  // Map the response to Announcement interface
  const announcement = mapAnnouncementResponse(response.data)
  
  return announcement
}

/**
 * Track announcement view
 */
export async function trackAnnouncementViewAPI(id: string): Promise<void> {
  try {
    await apiClient.post(`/announcements/${id}/view`)
    console.log('✅ Tracked announcement view:', id)
  } catch (error) {
    // Don't throw error for view tracking - it's not critical
    console.warn('⚠️ Failed to track announcement view:', error)
  }
}

/**
 * Create a new announcement
 * @param data - Announcement data
 * @param images - Optional array of image assets from react-native-image-picker
 */
export async function createAnnouncementAPI(
  data: any,
  images?: Array<{ uri?: string; type?: string; fileName?: string }>
): Promise<Announcement> {
  // If images are provided, use FormData
  if (images && images.length > 0) {
    const formData = new FormData()

    // Append all form fields
    Object.keys(data).forEach((key) => {
      const value = data[key]
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays (regions, villages) - append each item with the same key
          value.forEach((item) => {
            formData.append(key, String(item))
          })
        } else {
          formData.append(key, String(value))
        }
      }
    })

    // Append images (filter out any without URIs)
    images
      .filter((image) => image.uri)
      .forEach((image) => {
        const imageUri = image.uri!
        // Determine image type from URI or use default
        let imageType = image.type || 'image/jpeg'
        let fileExtension = 'jpg'
        
        // Try to determine type from URI
        if (imageUri.toLowerCase().includes('.png')) {
          imageType = 'image/png'
          fileExtension = 'png'
        } else if (imageUri.toLowerCase().includes('.webp')) {
          imageType = 'image/webp'
          fileExtension = 'webp'
        }
        
        // Use provided fileName or generate one
        const fileName = image.fileName || `image.${fileExtension}`
        
        formData.append('images', {
          uri: imageUri,
          type: imageType,
          name: fileName,
        } as any)
      })

    const response = await apiClient.post<Announcement>('/announcements', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } else {
    // No images, send as JSON
    const response = await apiClient.post<Announcement>('/announcements', data)
    return response.data
  }
}

/**
 * Update an announcement
 * @param id - Announcement ID
 * @param data - Announcement data
 * @param images - Optional array of image assets from react-native-image-picker
 */
export async function updateAnnouncementAPI(
  id: string,
  data: Partial<Announcement>,
  images?: Array<{ uri?: string; type?: string; fileName?: string }>
): Promise<Announcement> {
  // Check if we have images in data.images (existing URLs) or new file uploads
  const hasImagesInData = data.images && Array.isArray(data.images) && data.images.length > 0
  const hasNewImageFiles = images && images.length > 0 && images.some(img => 
    img.uri && (img.uri.startsWith('file://') || img.uri.startsWith('content://'))
  )
  
  // Use FormData if we have images (either in data or as file uploads)
  if (hasImagesInData || hasNewImageFiles || (images && images.length > 0)) {
    const formData = new FormData()

    // Append all form fields
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof Announcement]
      if (value !== undefined && value !== null) {
        if (key === 'images') {
          // Handle images array separately - append each URL
          if (Array.isArray(value)) {
            value.forEach((item) => {
              if (typeof item === 'string' && item.trim()) {
                formData.append('images', item)
              }
            })
          }
        } else if (Array.isArray(value)) {
          // Handle other arrays (regions, villages) - append each item with the same key
          value.forEach((item) => {
            formData.append(key, String(item))
          })
        } else {
          formData.append(key, String(value))
        }
      }
    })

    // Append new file uploads (file:// URIs) as files
    if (images && images.length > 0) {
      images
        .filter((image) => image.uri)
        .forEach((image) => {
          const imageUri = image.uri!
          
          // Only append file uploads (not HTTP URLs - those are already in data.images)
          if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
            // Determine image type from URI or use default
            let imageType = image.type || 'image/jpeg'
            let fileExtension = 'jpg'
            
            // Try to determine type from URI
            if (imageUri.toLowerCase().includes('.png')) {
              imageType = 'image/png'
              fileExtension = 'png'
            } else if (imageUri.toLowerCase().includes('.webp')) {
              imageType = 'image/webp'
              fileExtension = 'webp'
            }
            
            // Use provided fileName or generate one
            const fileName = image.fileName || `image.${fileExtension}`
            
            formData.append('images', {
              uri: imageUri,
              type: imageType,
              name: fileName,
            } as any)
          }
        })
    }

    const response = await apiClient.patch<Announcement>(`/announcements/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } else {
    // No images at all, send as JSON (but still include empty images array if needed)
    const response = await apiClient.patch<Announcement>(`/announcements/${id}`, data)
    return response.data
  }
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncementAPI(id: string): Promise<void> {
  await apiClient.delete(`/announcements/${id}`)
}

/**
 * Cancel an announcement
 */
export async function cancelAnnouncementAPI(id: string): Promise<Announcement> {
  const response = await apiClient.post<Announcement>(`/announcements/${id}/cancel`)
  return mapAnnouncementResponse(response.data)
}

/**
 * Get categories by announcement type
 */
export async function getCategoriesByTypeAPI(type: string): Promise<APICategory[]> {
  const response = await apiClient.get<APICategory[]>('/catalog/categories', {
    params: { type }
  })
  return response.data
}

/**
 * Get subcategories by category ID
 */
export async function getSubcategoriesByCategoryIdAPI(categoryId: string): Promise<APISubcategory[]> {
  const response = await apiClient.get<APISubcategory[]>(`/catalog/categories/${categoryId}/subcategories`)
  return response.data
}

/**
 * Submit an application for an announcement
 */
export interface ApplicationFormData {
  announcement_id: string
  delivery_dates?: string[] // For goods: array of delivery dates (YYYY-MM-DD format)
  count?: number // For goods: quantity
  unit?: 'daily' | 'monthly' | 'yearly' | 'hourly' // For rent/service: unit
  notes?: string
}

export async function submitApplicationAPI(data: ApplicationFormData): Promise<any> {
  const response = await apiClient.post('/applications', data)
  return response.data
}

export interface ApplicationUpdateData {
  delivery_dates?: string[]
  count?: number
  unit?: 'daily' | 'monthly' | 'yearly' | 'hourly'
  notes?: string
}

export async function updateApplicationAPI(id: string, data: ApplicationUpdateData): Promise<any> {
  const response = await apiClient.patch(`/applications/${id}`, data)
  return response.data
}

/**
 * Get applications for an announcement (by announcement owner or for display)
 * GET /applications/announcement/{announcementId}
 */
export interface ApplicationApplicant {
  id?: string
  full_name?: string
  phone?: string
  user_type?: string
  profile_picture?: string | null
}

export interface ApplicationListItem {
  id: string
  announcement_id?: string
  user_id?: string
  count?: number
  quantity?: number
  delivery_dates?: string[]
  unit?: string
  notes?: string
  status: string
  created_at?: string
  updated_at?: string
  applicant?: ApplicationApplicant
  /** @deprecated use applicant instead */
  user?: { name?: string; surname?: string }
  region?: string
  village?: string
  region_name?: string
  village_name?: string
}

export async function getApplicationsByAnnouncementAPI(announcementId: string): Promise<ApplicationListItem[]> {
  const response = await apiClient.get<any>(`/applications/announcement/${announcementId}`)
  const data = response.data
  if (Array.isArray(data)) return data.map(mapApplicationItem)
  if (data?.applications && Array.isArray(data.applications)) return data.applications.map(mapApplicationItem)
  return []
}

function mapApplicationItem(app: any): ApplicationListItem {
  // Normalize applicant from either `applicant` or legacy `user` field
  const rawApplicant = app.applicant ?? app.user
  const applicant: ApplicationApplicant | undefined = rawApplicant
    ? {
        id: rawApplicant.id,
        full_name:
          rawApplicant.full_name ??
          ([rawApplicant.name, rawApplicant.surname || rawApplicant.lastName]
            .filter(Boolean)
            .join(' ') || undefined),
        phone: rawApplicant.phone,
        user_type: rawApplicant.user_type ?? rawApplicant.userType,
        profile_picture: rawApplicant.profile_picture ?? rawApplicant.profilePicture ?? null,
      }
    : undefined

  return {
    id: app.id || '',
    announcement_id: app.announcement_id || app.announcementId,
    user_id: app.applicant_id ?? app.user_id ?? app.userId,
    count: app.count ?? app.quantity,
    quantity: app.quantity ?? app.count,
    delivery_dates: Array.isArray(app.delivery_dates)
      ? app.delivery_dates
      : app.delivery_dates
        ? [app.delivery_dates]
        : [],
    unit: app.unit,
    notes: app.notes,
    status: app.status || 'pending',
    created_at: app.created_at || app.createdAt,
    updated_at: app.updated_at || app.updatedAt,
    applicant,
    user: app.user
      ? { name: app.user.name, surname: app.user.surname || app.user.lastName }
      : undefined,
    region: app.region,
    village: app.village,
    region_name: app.region_name,
    village_name: app.village_name,
  }
}

/**
 * Close an application
 */
export async function closeApplicationAPI(id: string): Promise<any> {
  const response = await apiClient.post(`/applications/${id}/close`)
  return response.data
}

/**
 * Approve an application (announcement owner)
 */
export async function approveApplicationAPI(id: string): Promise<any> {
  const response = await apiClient.post(`/applications/${id}/approve`)
  return response.data
}

/**
 * Reject an application (announcement owner)
 */
export async function rejectApplicationAPI(id: string): Promise<any> {
  const response = await apiClient.post(`/applications/${id}/reject`)
  return response.data
}

/**
 * Add a favorite announcement
 */
export async function addFavoriteAPI(announcementId: string): Promise<void> {
  try {
    await apiClient.post('/favorites', { announcement_id: announcementId })
  } catch (error: any) {
    console.error('Error adding favorite:', error)
    throw error
  }
}

/**
 * Get favorite announcements with pagination
 */
export interface GetFavoritesParams {
  page?: number
  limit?: number
  signal?: AbortSignal // AbortSignal for request cancellation
}

export async function getFavoritesAPI(params?: GetFavoritesParams): Promise<PaginatedResponse<Announcement>> {
  try {
    const queryParams: any = {}
    if (params?.page) queryParams.page = params.page
    if (params?.limit) queryParams.limit = params.limit
    
    const queryString = Object.keys(queryParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&')
    
    const response = await apiClient.get<any>(`/favorites${queryString ? `?${queryString}` : ''}`, {
      signal: params?.signal,
    })
    
    // Handle paginated response structure
    if (response.data?.announcements && Array.isArray(response.data.announcements)) {
      const announcementsData: Announcement[] = response.data.announcements.map((item: any) => mapAnnouncementResponse(item))
      return {
        announcements: announcementsData,
        total: response.data.total || announcementsData.length,
        page: response.data.page || 1,
        limit: response.data.limit || announcementsData.length,
      }
    }
    
    // Fallback: Handle different response structures for backward compatibility
    let announcementsData: any[] = []
    if (Array.isArray(response.data)) {
      announcementsData = response.data
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      announcementsData = response.data.data
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      announcementsData = response.data.results
    } else if (response.data?.items && Array.isArray(response.data.items)) {
      announcementsData = response.data.items
    }
    
    const announcements: Announcement[] = announcementsData.map((item: any) => mapAnnouncementResponse(item))
    
    // Return paginated structure (for backward compatibility, assume all items are on page 1)
    return {
      announcements,
      total: announcements.length,
      page: 1,
      limit: announcements.length,
    }
  } catch (error: any) {
    console.error('Error fetching favorites:', error)
    throw error
  }
}

/**
 * Remove a favorite announcement
 */
export async function removeFavoriteAPI(announcementId: string): Promise<void> {
  try {
    await apiClient.delete(`/favorites/${announcementId}`)
  } catch (error: any) {
    console.error('Error removing favorite:', error)
    throw error
  }
}

