import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { useTranslation } from 'react-i18next'
import { changeLanguage } from '../i18n'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'hy' ? 'en' : 'hy'
    changeLanguage(newLang)
  }

  return (
    <TouchableOpacity style={styles.container} onPress={toggleLanguage}>
      <Text style={styles.text}>{i18n.language === 'hy' ? 'EN' : 'ՀԱ'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
})

