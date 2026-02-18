import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Platform, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors } from '../theme/colors'
import Icon from './Icon'
import { ProfileMenuModal } from './ProfileMenuModal'

interface AppHeaderProps {
  title?: string
  showBack?: boolean
  showSearch?: boolean
  showProfile?: boolean
  onSearchPress?: () => void
  onProfilePress?: () => void
}

export function AppHeader({
  title,
  showBack = false,
  showSearch = false,
  showProfile = false,
  onSearchPress,
  onProfilePress,
}: AppHeaderProps) {
  const navigation = useNavigation()
  const [menuVisible, setMenuVisible] = useState(false)

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress()
    }
    setMenuVisible(true)
  }

  return (
    <>
    <View style={styles.header}>
      {/* Left Side */}
      <View style={styles.headerLeft}>
        {showBack && (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
            style={({ pressed }) => [
              styles.backButton,
              Platform.OS === 'ios' && pressed && { opacity: 0.6 },
            ]}
          >
            <Icon name="arrow-back" size={20} color={colors.primary} />
          </Pressable>
        )}
        {title && <Text style={styles.headerTitle}>{title}</Text>}
      </View>

      {/* Right Side */}
      <View style={styles.headerRight}>
        {/* Search icon commented out
        {showSearch && (
          <TouchableOpacity onPress={onSearchPress} style={styles.headerIconButton}>
            <Icon name="search" size={24} color={colors.white} />
          </TouchableOpacity>
        )}
        */}
        {showProfile && (
          <TouchableOpacity onPress={handleProfilePress} style={styles.headerIconButton}>
            <View style={styles.headerAvatar}>
              <Icon name="person" size={20} color={colors.white} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>

    {/* Profile Menu Modal */}
    <ProfileMenuModal
      visible={menuVisible}
      onClose={() => setMenuVisible(false)}
    />
  </>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 5,
    backgroundColor: 'white',
    borderRadius:100,
    // backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    width: '80%',
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    padding: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

