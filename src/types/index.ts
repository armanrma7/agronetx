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
export type AnnouncementStatus = 'active' | 'completed' | 'canceled' | 'published' | 'closed'

export interface Translation {
  name_am: string;
  name_en: string;
  name_ru: string;
}

export interface RegionVillage {
  id: string;
  name_am: string;
  name_en: string;
  name_ru: string;
}

export interface Measurement {
  en: string;
  hy: string;
  ru: string;
}

export interface Owner {
  id: string;
  full_name: string;
  phone: string;
  region_id: string;
  village_id: string;
  region: RegionVillage;
  village: RegionVillage;
}

export interface Group extends Translation {
  id: string;
}

export interface Item extends Translation {
  id: string;
  measurements: Measurement[];
}

export interface ClosedByUser {
  id: string;
  full_name: string;
}

export interface AnnouncementApplication {
  id?: string;
  // add more fields later if needed
}

export interface Announcement {
  id: string;
  type: 'sell' | 'buy' | string;
  category: string;

  group_id: string;
  item_id: string;

  price: string;
  description: string;

  owner_id: string;
  status: 'published' | 'pending' | 'closed' | 'rejected' | string;

  closed_by: string | null;

  count: string;
  daily_limit: string;
  available_quantity: string;
  unit: string;

  images: string[];

  date_from: string | null;
  date_to: string | null;

  min_area: number | null;

  regions: string[];
  villages: string[];

  views_count: number;

  created_at: string;
  updated_at: string;

  owner: Owner;
  group: Group;
  item: Item;
  closedByUser: ClosedByUser | null;

  regions_data: RegionVillage[];
  villages_data: RegionVillage[];

  applications_count: number;
  applications: AnnouncementApplication[];
}


// Backward compatibility aliases
export type ListingType = AnnouncementType
export type ListingStatus = AnnouncementStatus
export type Listing = Announcement
