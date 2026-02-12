/**
 * Announcements API
 * Handles announcements-related API calls
 */

import apiClient from './client'
import { Announcement } from '../../types'

// API Category interface
export interface APICategory {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_ru?: string
  type: string
}

// API Item interface
export interface APIItem {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_ru?: string
  subcategory_id: string
  measurements?: Array<{
    en: string
    hy: string
    ru: string
  }>
}

// API Subcategory interface
export interface APISubcategory {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_ru?: string
  category_id: string
  items?: APIItem[]
}

export interface GetAnnouncementsParams {
  category?: 'goods' | 'service' | 'rent'
  status?: 'active' | 'completed' | 'cancelled' | 'published'
  region?: string[] // Array of region UUIDs
  village?: string[] // Array of village UUIDs
  created_from?: string // Date in YYYY-MM-DD format
  created_to?: string // Date in YYYY-MM-DD format
  limit?: number
  offset?: number
}

/**
 * Map server response to Announcement interface
 */
function mapAnnouncementResponse(data: any): Announcement & { 
  subtype?: string
  date_to?: string
  item_name?: string
  name_en?: string
  name_ru?: string
  name_hy?: string
  name_am?: string
  apiType?: string // The API type field (sell/buy/rent)
} {
  // API sends: type = "sell"/"buy"/"rent", category = "goods"/"service"/"rent"
  // Our Announcement interface uses: type = category (goods/service/rent)
  const apiType = data.type // This is sell/buy/rent from API
  const category = data.category || data.type || 'goods' // This is goods/service/rent
  
  return {
    id: data.id || '',
    user_id: data.user_id || data.userId || '',
    type: category, // Store category in type field (goods/service/rent)
    status: data.status || 'active',
    title: data.title || data.item_name || data.item?.name || '',
    description: data.description,
    price: data.price || 0,
    price_unit: data.price_unit || data.priceUnit || data.unit || 'դր',
    quantity: data.quantity || data.count,
    quantity_unit: data.quantity_unit || data.quantityUnit || data.unit,
    location_region: data.location_region || data.region || data.regions?.[0] || '',
    location_city: data.location_city || data.city || data.villages?.[0],
    // Store full arrays for counting
    regions: Array.isArray(data.regions) ? data.regions : (data.regions ? [data.regions] : []),
    villages: Array.isArray(data.villages) ? data.villages : (data.villages ? [data.villages] : []),
    // Calculate applications_count: prefer explicit count, otherwise count applications array
    applications_count: data.applications_count !== undefined ? data.applications_count : 
                       (data.applicationsCount !== undefined ? data.applicationsCount : 
                       (Array.isArray(data.applications) ? data.applications.length : 0)),
    // Use applications_count for participants_count if available, otherwise fallback
    participants_count: data.participants_count || data.participantsCount || data.applications_count || 
                        (Array.isArray(data.applications) ? data.applications.length : 0),
    views_count: data.views_count || data.viewsCount || data.view_count || 0,
    created_at: data.created_at || data.createdAt || new Date().toISOString(),
    updated_at: data.updated_at || data.updatedAt || new Date().toISOString(),
    expires_at: data.expires_at || data.expiresAt || data.date_to || data.dateTo,
    user: data.user ? {
      name: data.user.name || '',
      surname: data.user.surname || data.user.lastName || '',
    } : undefined,
    // Additional fields for card display
    subtype: data.subtype || data.sub_type || apiType,
    date_to: data.date_to || data.dateTo || data.expires_at || data.expiresAt,
    item_name: data.item_name || data.item?.name || data.title,
    apiType: apiType, // Store the API type (sell/buy/rent) separately
    // Translated name fields
    name_en: data.name_en || data.item?.name_en || data.item_name_en,
    name_ru: data.name_ru || data.item?.name_ru || data.item_name_ru,
    name_hy: data.name_hy || data.item?.name_hy || data.item_name_hy,
    name_am: data.name_am || data.item?.name_am || data.item_name_am || data.name_hy || data.item?.name_hy,
    // Images array
    images: Array.isArray(data.images) ? data.images : (data.images ? [data.images] : []),
    // Daily limit for goods
    daily_limit: data.daily_limit || data.dailyLimit,
    // Category and item info
    category_name: data.category_name || data.category?.name,
    category_name_hy: data.category_name_hy || data.category?.name_hy,
    category_name_ru: data.category_name_ru || data.category?.name_ru,
    category_name_en: data.category_name_en || data.category?.name_en,
    item_name_full: data.item_name || data.item?.name || data.title,
    item_name_hy_full: data.item_name_hy || data.item?.name_hy || data.name_hy,
    item_name_ru_full: data.item_name_ru || data.item?.name_ru || data.name_ru,
    item_name_en_full: data.item_name_en || data.item?.name_en || data.name_en,
    // Region and village names (if provided by API)
    region_names: Array.isArray(data.region_names) ? data.region_names : (data.region_names ? [data.region_names] : []),
    village_names: Array.isArray(data.village_names) ? data.village_names : (data.village_names ? [data.village_names] : []),
    // Also check for alternative field names
    location_region_names: Array.isArray(data.location_region_names) ? data.location_region_names : (data.location_region_names ? [data.location_region_names] : []),
    location_village_names: Array.isArray(data.location_village_names) ? data.location_village_names : (data.location_village_names ? [data.location_village_names] : []),
    // Regions and villages data arrays (with full objects)
    regions_data: Array.isArray(data.regions_data) ? data.regions_data : (data.regions_data ? [data.regions_data] : []),
    villages_data: Array.isArray(data.villages_data) ? data.villages_data : (data.villages_data ? [data.villages_data] : []),
    // Applications array
    applications: Array.isArray(data.applications) ? data.applications.map((app: any) => ({
      id: app.id || '',
      announcement_id: app.announcement_id || app.announcementId || '',
      user_id: app.user_id || app.userId || '',
      count: app.count || app.quantity,
      delivery_dates: Array.isArray(app.delivery_dates) ? app.delivery_dates : (app.delivery_dates ? [app.delivery_dates] : []),
      unit: app.unit,
      notes: app.notes,
      status: app.status,
      created_at: app.created_at || app.createdAt,
      updated_at: app.updated_at || app.updatedAt,
      user: app.user ? {
        name: app.user.name || '',
        surname: app.user.surname || app.user.lastName || '',
      } : undefined,
    })) : [],
    // My applications count (for applied announcements)
    my_applications_count: data.my_applications_count !== undefined 
      ? data.my_applications_count 
      : (data.myApplicationsCount !== undefined 
        ? data.myApplicationsCount 
        : (Array.isArray(data.applications) && data.applications.length > 0 
          ? data.applications.length 
          : undefined)),
  } as Announcement & { 
    subtype?: string
    date_to?: string
    item_name?: string
    name_en?: string
    name_ru?: string
    name_hy?: string
    name_am?: string
    apiType?: string
    regions?: string[]
    villages?: string[]
    images?: string[]
    daily_limit?: number
    category_name?: string
    category_name_hy?: string
    category_name_ru?: string
    category_name_en?: string
    item_name_full?: string
    item_name_hy_full?: string
    item_name_ru_full?: string
    item_name_en_full?: string
    region_names?: string[]
    village_names?: string[]
    location_region_names?: string[]
    location_village_names?: string[]
    regions_data?: any[]
    villages_data?: any[]
    applications_count?: number
    applications?: any[]
    my_applications_count?: number
  }
}

/**
 * Get announcements with optional filters
 */
export async function getAnnouncementsAPI(params?: GetAnnouncementsParams): Promise<Announcement[]> {
  // Build query params, handling arrays for region and village
  const queryParams: any = {}
  
  if (params) {
    // Handle simple params
    if (params.category) queryParams.category = params.category
    if (params.status) queryParams.status = params.status
    if (params.created_from) queryParams.created_from = params.created_from
    if (params.created_to) queryParams.created_to = params.created_to
    if (params.limit !== undefined) queryParams.limit = params.limit
    if (params.offset !== undefined) queryParams.offset = params.offset
    
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
  
  const response = await apiClient.get<any>(`/announcements${queryString ? `?${queryString}` : ''}`)
  
  // Handle different response structures
  let announcementsData: any[] = []
  if (Array.isArray(response.data)) {
    announcementsData = response.data
  } else if (response.data?.announcements && Array.isArray(response.data.announcements)) {
    announcementsData = response.data.announcements
  } else if (response.data?.data && Array.isArray(response.data.data)) {
    announcementsData = response.data.data
  } else if (response.data?.results && Array.isArray(response.data.results)) {
    announcementsData = response.data.results
  } else if (response.data?.items && Array.isArray(response.data.items)) {
    announcementsData = response.data.items
  }
  
  const announcements = announcementsData.map(mapAnnouncementResponse)
  return announcements
}

/**
 * Get current user's announcements
 */
export async function getMyAnnouncementsAPI(): Promise<Announcement[]> {
  const response = await apiClient.get<any>('/announcements/me')
  
  // Handle different response structures
  let announcementsData: any[] = []
  if (Array.isArray(response.data)) {
    announcementsData = response.data
  } else if (response.data?.announcements && Array.isArray(response.data.announcements)) {
    announcementsData = response.data.announcements
  } else if (response.data?.data && Array.isArray(response.data.data)) {
    announcementsData = response.data.data
  } else if (response.data?.results && Array.isArray(response.data.results)) {
    announcementsData = response.data.results
  } else if (response.data?.items && Array.isArray(response.data.items)) {
    announcementsData = response.data.items
  }
  
  const announcements = announcementsData.map(mapAnnouncementResponse)
  return announcements
}

/**
 * Get announcements that the current user has applied to
 */
export async function getAppliedAnnouncementsAPI(): Promise<Announcement[]> {
  const response = await apiClient.get<any>('/announcements/applied')
  
  // Handle different response structures
  let announcementsData: any[] = []
  if (Array.isArray(response.data)) {
    announcementsData = response.data
  } else if (response.data?.announcements && Array.isArray(response.data.announcements)) {
    announcementsData = response.data.announcements
  } else if (response.data?.data && Array.isArray(response.data.data)) {
    announcementsData = response.data.data
  } else if (response.data?.results && Array.isArray(response.data.results)) {
    announcementsData = response.data.results
  } else if (response.data?.items && Array.isArray(response.data.items)) {
    announcementsData = response.data.items
  }
  
  const announcements = announcementsData.map(mapAnnouncementResponse)
  return announcements
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
 */
export async function updateAnnouncementAPI(id: string, data: Partial<Announcement>): Promise<Announcement> {
  const response = await apiClient.patch<Announcement>(`/announcements/${id}`, data)
  return response.data
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncementAPI(id: string): Promise<void> {
  await apiClient.delete(`/announcements/${id}`)
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

