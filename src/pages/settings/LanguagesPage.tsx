import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { AppHeader } from '../../components/AppHeader'
import { changeLanguage } from '../../i18n'
import Icon from '../../components/Icon'

interface Language {
  code: string
  name: string
  flag: string
}

const LANGUAGES: Language[] = [
  { code: 'hy', name: 'Հայերեն', flag: '🇦🇲' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
]

// Get language name based on current language
const getLanguageName = (code: string, currentLang: string): string => {
  const names: Record<string, Record<string, string>> = {
    hy: { hy: 'Հայերեն', ru: 'Ռուսերեն', en: 'Անգլերեն' },
    ru: { hy: 'Армянский', ru: 'Русский', en: 'Английский' },
    en: { hy: 'Armenian', ru: 'Russian', en: 'English' },
  }
  return names[currentLang]?.[code] || LANGUAGES.find(l => l.code === code)?.name || code
}

export function LanguagesPage() {
  const navigation = useNavigation()
  const { i18n, t } = useTranslation()
  const currentLang = (i18n.language || 'hy').split('-')[0]
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'hy')

  const handleSearchPress = () => {
    console.log('Search pressed')
  }

  const handleProfilePress = () => {
    console.log('Profile pressed')
  }

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      setSelectedLanguage(languageCode)
      await changeLanguage(languageCode as 'hy' | 'ru' | 'en')
      setTimeout(() => {
        navigation.goBack()
      }, 300)
    } catch (error) {
      console.error('Error changing language:', error)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <AppHeader
          showBack
          onSearchPress={handleSearchPress}
          onProfilePress={handleProfilePress}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Title */}
          <Text style={styles.pageTitle}>{t('settings.languages')}</Text>

          {/* Language Options */}
          <View style={styles.languageList}>
            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={styles.languageItem}
                onPress={() => handleLanguageSelect(language.code)}
              >
                <View style={styles.languageLeft}>
                  <Text style={styles.flag}>{language.flag}</Text>
                  <Text style={styles.languageName}>{getLanguageName(language.code, currentLang)}</Text>
                </View>
                <View style={styles.languageRight}>
                  {selectedLanguage === language.code && (
                    <Icon name="check" size={20} color={colors.buttonPrimary} />
                  )}
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  languageList: {
    gap: 0,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageName: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  languageRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})

