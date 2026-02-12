import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors } from '../theme/colors'
import Icon from './Icon'

interface SearchModalProps {
  visible: boolean
  onClose: () => void
  onSearch: (query: string) => void
}

const RECENT_SEARCHES_KEY = '@agronetx_recent_searches'
const MAX_RECENT_SEARCHES = 5

export function SearchModal({ visible, onClose, onSearch }: SearchModalProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    if (visible) {
      loadRecentSearches()
    }
  }, [visible])

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading recent searches:', error)
    }
  }

  const saveRecentSearch = async (query: string) => {
    if (!query.trim()) return

    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)]
        .slice(0, MAX_RECENT_SEARCHES)
      setRecentSearches(updated)
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Error saving recent search:', error)
    }
  }

  const removeRecentSearch = async (query: string) => {
    try {
      const updated = recentSearches.filter(s => s !== query)
      setRecentSearches(updated)
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Error removing recent search:', error)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim())
      onSearch(searchQuery.trim())
      onClose()
      setSearchQuery('')
    }
  }

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query)
    onSearch(query)
    onClose()
    setSearchQuery('')
  }

  const renderRecentSearchItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.recentItem}
      onPress={() => handleRecentSearchPress(item)}
    >
      <Text style={styles.recentItemText}>{item}</Text>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation()
          removeRecentSearch(item)
        }}
        style={styles.removeButton}
      >
        <Icon name="close" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Icon name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={colors.textPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>{t('search.recentSearches')}</Text>
            <FlatList
              data={recentSearches}
              renderItem={renderRecentSearchItem}
              keyExtractor={(item, index) => `${item}-${index}`}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 50,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
  },
  recentSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  removeButton: {
    padding: 4,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
})

