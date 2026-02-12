export type SupportedLang = 'hy' | 'ru' | 'en'

export interface MultilingualLabel {
  hy: string
  ru: string
  en: string
}

export interface Unit {
  code: string
  label: MultilingualLabel
}

export interface Item {
  id: string
  code: string
  label: MultilingualLabel
  unit: Unit
}

export interface SubCategory {
  id: string
  code: string
  label: MultilingualLabel
  items: Item[]
}

export interface Category {
  id: string
  code: string
  label: MultilingualLabel
  sub_categories: SubCategory[]
}

export interface ItemsJson {
  categories: Category[]
}


