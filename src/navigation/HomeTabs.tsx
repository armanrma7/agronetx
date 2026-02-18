import React, { useState, useEffect, useRef } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation, useNavigationState, useFocusEffect } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { AnnouncementsPage, AddAnnouncementPage, NotificationsPage, FavoritesPage } from '../pages/main'
import { MyAnnouncementsPage } from '../pages/profile/MyAnnouncementsPage'
import Icon from '../components/Icon'
import { FilterModal, FilterValues } from '../components/FilterModal'
import { NotificationFilterModal, NotificationFilterValues } from '../components/NotificationFilterModal'
import { SearchModal } from '../components/SearchModal'
import { ProfileMenuModal } from '../components/ProfileMenuModal'
import { AddAnnouncementModal } from '../components/AddAnnouncementModal'
import { colors } from '../theme/colors'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { AnnouncementType } from '../types'

const Tab = createBottomTabNavigator()

// Create a context to share filters between HomeTabs and AnnouncementsPage
export const FilterContext = React.createContext<{
  filters: FilterValues | null
  setFilters: (filters: FilterValues | null) => void
}>({
  filters: null,
  setFilters: () => {},
})

function HeaderRight({ onSearchPress, onFilterPress, onProfilePress }: { 
  onSearchPress: () => void
  onFilterPress: () => void
  onProfilePress: () => void
}) {
  return (
    <View style={styles.headerActions}>
      {/* Search icon commented out
      <TouchableOpacity onPress={onSearchPress} style={{ marginRight: 16 }}>
        <Icon name="search" size={24} color={colors.white} />
      </TouchableOpacity>
      */}
      <TouchableOpacity onPress={onProfilePress} style={{ marginRight: 12 }}>
        <View style={styles.headerAvatar}>
          <Icon name="person" size={20} color={colors.white} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onFilterPress} style={{ marginRight: 16, marginLeft: 12 }}>
        <Icon name="filter" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

export function HomeTabs() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [notificationFilterModalVisible, setNotificationFilterModalVisible] = useState(false)
  const [searchModalVisible, setSearchModalVisible] = useState(false)
  const [profileMenuVisible, setProfileMenuVisible] = useState(false)
  const [addAnnouncementModalVisible, setAddAnnouncementModalVisible] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterValues | null>(null)
  const [appliedNotificationFilters, setAppliedNotificationFilters] = useState<NotificationFilterValues | null>(null)
  const [currentRoute, setCurrentRoute] = useState<string>('Announcements')
  const routeState = useNavigationState((state) => state)
  const currentRouteName = routeState?.routes[routeState.index]?.name || 'Announcements'

  // Update current route when navigation state changes
  useEffect(() => {
    if (currentRouteName) {
      setCurrentRoute(currentRouteName)
    }
  }, [currentRouteName])
  
  const handleFilterPress = (routeName?: string) => {
    const route = routeName || currentRoute
    if (route === 'Notifications') {
      setNotificationFilterModalVisible(true)
    } else {
      setFilterModalVisible(true)
    }
  }

  const handleSearchPress = () => {
    setSearchModalVisible(true)
  }

  const handleProfilePress = () => {
    setProfileMenuVisible(true)
  }

  const handleApplyFilters = (filters: FilterValues) => {
    console.log('🎯 HomeTabs: Applying filters:', filters)
    
    // Check if filters object has any values
    const hasFilters = filters && Object.keys(filters).length > 0
    
    const filtersToApply = hasFilters ? filters : null
    setAppliedFilters(filtersToApply)
    
    // Filters are passed via context, so AnnouncementsPage will automatically pick them up
    // No need to navigate - if user is on Announcements tab, filters will apply immediately
    // If user is on another tab, they can switch to Announcements tab to see filtered results
    console.log('✅ Filters applied via context, AnnouncementsPage will update automatically')
  }

  const handleApplyNotificationFilters = (filters: NotificationFilterValues) => {
    setAppliedNotificationFilters(filters)
    // Pass filters to NotificationsPage via navigation params
    ;(navigation as any).navigate('Notifications', { filters })
  }

  const handleSearch = (query: string) => {
    // TODO: Apply search query to announcements
    console.log('Search query:', query)
  }

  const handleSelectAnnouncementType = (type: AnnouncementType) => {
    setAddAnnouncementModalVisible(false)
    // Navigate to the form page with the selected type
    ;(navigation as any).navigate('NewAnnouncementForm', { type })
  }
  
  return (
    <FilterContext.Provider value={{ filters: appliedFilters, setFilters: setAppliedFilters }}>
      <Tab.Navigator
        screenOptions={({ route }: any) => ({
            tabBarIcon: ({ focused, color, size }: any) => {
              let iconName = 'home'

              if (route.name === 'Announcements') {
                iconName = 'home'
              } else if (route.name === 'AddAnnouncement') {
                // Modern floating button style
                return (
                  <View style={styles.addButtonContainer}>
                    <View style={styles.addButtonCircle}>
                      <Icon name="add" size={24} color={colors.white} />
                    </View>
                  </View>
                )
              } else if (route.name === 'Notifications') {
                iconName = 'notifications'
              } else if (route.name === 'Favorites') {
                iconName = 'bookmark'
              } else if (route.name === 'MyAnnouncements') {
                iconName = 'campaign'
              }

              return <Icon name={iconName} size={size} color={color} />
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: {
              height: 70,
              paddingBottom: 10,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
              backgroundColor: colors.white,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 8,
              position: 'relative',
            },
            tabBarLabelStyle: {
              display: 'none', // Hide tab labels
            },
            tabBarShowLabel: false, // Hide tab labels
            headerStyle: {
              backgroundColor: colors.buttonPrimary,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            // ✅ Remove ALL glass/blur effects from tab headers
            headerTransparent: false,
            headerBlurEffect: undefined,
            headerLargeTitle: false,
            headerShadowVisible: false,
            headerTintColor: colors.white,
            headerTitleAlign: 'left',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 24,
              fontStyle: 'italic',
            },
            headerRight: () => (
              <HeaderRight 
                onSearchPress={handleSearchPress} 
                onFilterPress={() => handleFilterPress(currentRoute)} 
                onProfilePress={handleProfilePress} 
              />
            ),
        })}
      >
      <Tab.Screen
        name="Announcements"
        component={AnnouncementsPage}
        options={{
          title: t('appName'),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesPage}
        options={{
          title: t('appName'),
        }}
      />
      <Tab.Screen
        name="AddAnnouncement"
        component={AddAnnouncementPage}
        listeners={{
          tabPress: (e) => {
            e.preventDefault()
            setAddAnnouncementModalVisible(true)
          },
        }}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsPage}
        options={{
          title: t('appName'),
        }}
      />
      <Tab.Screen
        name="MyAnnouncements"
        component={MyAnnouncementsPage}
        options={{
          headerShown: true,
          title: t('appName'),
        }}
      />
      </Tab.Navigator>
      
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={appliedFilters || undefined}
      />
      
      <NotificationFilterModal
        visible={notificationFilterModalVisible}
        onClose={() => setNotificationFilterModalVisible(false)}
        onApply={handleApplyNotificationFilters}
      />
      
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSearch={handleSearch}
      />
      
      <ProfileMenuModal
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
      />
      
      <AddAnnouncementModal
        visible={addAnnouncementModalVisible}
        onClose={() => setAddAnnouncementModalVisible(false)}
        onSelectType={handleSelectAnnouncementType}
      />
    </FilterContext.Provider>
  )
}

const styles = StyleSheet.create({
  addButtonContainer: {
    marginTop: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: colors.white,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addButtonTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
