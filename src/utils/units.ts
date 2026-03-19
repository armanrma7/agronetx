export type SupportedUnitLang = 'hy' | 'ru' | 'en'

export function getUnitLang(raw: string | undefined): SupportedUnitLang {
  const lang = (raw || 'hy').split('-')[0].toLowerCase()
  if (lang === 'ru' || lang === 'en' || lang === 'hy') return lang
  return 'hy'
}

export function translateMeasureUnit(unitRaw: string | undefined | null, langRaw: string | undefined): string {
  const u = (unitRaw || '').toString().trim()
  if (!u) return ''
  const lang = getUnitLang(langRaw)
  const key = u
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/mÂ²/g, 'm²')
    .replace(/m2/g, 'm²')

  const map: Record<string, { hy: string; ru: string; en: string }> = {
    "kg": { "hy": "կգ", "ru": "кг", "en": "kg" },
    "t": { "hy": "տն", "ru": "т", "en": "t" },
    "lt": { "hy": "լիտր", "ru": "лт", "en": "lt" },
    "un": { "hy": "հատ", "ru": "шт", "en": "un" },
    "pk": { "hy": "փաթեթ", "ru": "уп", "en": "pk" },
    "bdl": { "hy": "կպց", "ru": "пуч", "en": "bdl" },
    "box": { "hy": "արկղ", "ru": "ящик", "en": "box" },
    "m2": { "hy": "մ²", "ru": "м²", "en": "m²" },
    "m²": { "hy": "մ²", "ru": "м²", "en": "m²" },
    "m3": { "hy": "մ³", "ru": "м³", "en": "m³" },
    "m³": { "hy": "մ³", "ru": "м³", "en": "m³" },
    "ha": { "hy": "հա", "ru": "га", "en": "ha" },
    "day":{ "hy": "օր", "ru": "день", "en": "day"},
    "hour":{ "hy": "ժամ", "ru": "час", "en": "hour" },
    "month":{ "hy": "ամիս", "ru": "месяц", "en": "month" },
    "year": { "hy": "տարի", "ru": "год", "en": "year" },
    "tree": { "hy": "ծառ", "ru": "дер", "en": "tree" },
    "bed": { "hy": "մարգ", "ru": "гряд", "en": "bed" }
  }

  
  const entry = map[key]
  if (!entry) return u
  if (lang === 'ru') return entry.ru
  if (lang === 'en') return entry.en
  return entry.hy
}

