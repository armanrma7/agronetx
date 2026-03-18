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
    kg: { hy: 'կգ', ru: 'кг', en: 'kg' },
    g: { hy: 'գ', ru: 'г', en: 'g' },
    t: { hy: 'տ', ru: 'т', en: 't' },
    l: { hy: 'լ', ru: 'л', en: 'l' },
    litr: { hy: 'լ', ru: 'л', en: 'l' },
    litre: { hy: 'լ', ru: 'л', en: 'l' },
    m: { hy: 'մ', ru: 'м', en: 'm' },
    'm²': { hy: 'մ²', ru: 'м²', en: 'm²' },
    ha: { hy: 'հա', ru: 'га', en: 'ha' },
    day: { hy: 'օր', ru: 'день', en: 'day' },
    month: { hy: 'ամիս', ru: 'месяц', en: 'month' },
    year: { hy: 'տարի', ru: 'год', en: 'year' },
    hour: { hy: 'ժամ', ru: 'час', en: 'hour' },
  }

  const entry = map[key]
  if (!entry) return u
  if (lang === 'ru') return entry.ru
  if (lang === 'en') return entry.en
  return entry.hy
}

