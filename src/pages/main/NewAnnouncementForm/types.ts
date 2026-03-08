import type { AnnouncementType, Announcement } from '../../../types'

export interface RouteParams {
  type: AnnouncementType
  announcementId?: string
  announcement?: Announcement
}

export interface FormData {
  applicationType: AnnouncementType
  subtype: string
  group: string
  name: string
  quantity: string
  measurementUnit: string
  rentUnit: string
  pricePerUnit: string
  dailyMaxQuantity: string
  salesPeriod: string
  periodStart: string
  description: string
}

export interface SelectOption {
  value: string
  label: string
  isHeader?: boolean
  headerLabel?: string
}

export const INITIAL_FORM_DATA: FormData = {
  applicationType: 'goods',
  subtype: '',
  group: '',
  name: '',
  quantity: '',
  measurementUnit: '',
  rentUnit: '',
  pricePerUnit: '',
  dailyMaxQuantity: '',
  salesPeriod: '',
  periodStart: '',
  description: '',
}
