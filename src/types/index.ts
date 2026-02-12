export type AccountType = 'farmer' | 'company' | ''
export type ContactMethod = 'sms'
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'banned' | ''
export type Role = 'user' | 'farmer' | 'admin'

export interface Profile {
  id: string
  user_id?: string
  username?: string
  fullname: string
  email_or_phone?: string // Optional - for display purposes
  account_type: string
  verification_type: string // sms
  account_status: string
  role: string
  created_at?: string
  updated_at?: string
}

export interface UserEmail {
  id: string
  user_id: string
  email: string
  is_primary: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface UserPhone {
  id: string
  user_id: string
  phone: string
  is_primary: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface RegisterFormData {
  accountType: AccountType
  fullname: string
  verificationType: ContactMethod
  emailOrPhone: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
}

export interface UpdateContactFormData {
  phoneOrEmail: string
}

export interface AuthState {
  user: any
  session: any
  profile: Profile | null
  loading: boolean
  error: string | null
}

export interface AuthAction {
  type: string
  payload?: any
}

export interface AuthContextType {
  user: any
  session: any
  profile: Profile | null
  loading: boolean
  error: string | null
  register: (phone: string, password: string, metadata: {
    fullname: string;
    accountType: string;
    verificationType: string;
    role: string;
    accountStatus: string;
  }) => Promise<{ success: boolean; phone: string; requiresVerification: boolean } | void>
  login: (phone: string, password: string) => Promise<void>
  verifyOTP: (phone: string, token: string) => Promise<void>
  sendOTP: (phone: string) => Promise<void>
  updateContact: (phoneOrEmail: string) => Promise<void>
  logout: () => Promise<void>
}

// Announcement types
export type AnnouncementType = 'goods' | 'service' | 'rent'
export type AnnouncementStatus = 'active' | 'completed' | 'cancelled' | 'published'

export interface Announcement {
  id: string
  user_id: string
  type: AnnouncementType
  status: AnnouncementStatus
  title: string
  description?: string
  price: number
  price_unit: string // e.g., "դր/կգ", "դր/ծառա", "դր/օր"
  quantity?: number
  quantity_unit?: string // e.g., "կգ", "լիտր"
  location_region: string
  location_city?: string
  participants_count?: number
  created_at: string
  updated_at: string
  expires_at?: string
  
  // Relations
  user?: {
    name: string
    surname: string
  }
}

// Backward compatibility aliases
export type ListingType = AnnouncementType
export type ListingStatus = AnnouncementStatus
export type Listing = Announcement
