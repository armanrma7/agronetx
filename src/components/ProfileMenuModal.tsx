import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import Icon from './Icon'

interface ProfileMenuModalProps {
  visible: boolean
  onClose: () => void
}

export function ProfileMenuModal({ visible, onClose }: ProfileMenuModalProps) {
  const navigation = useNavigation()
  const { logout } = useAuth()

  const handlePersonalData = () => {
    onClose()
    ;(navigation as any).navigate('Profile')
  }

  const handleLanguages = () => {
    onClose()
    ;(navigation as any).navigate('Languages')
  }

  const handleHelpSupport = () => {
    onClose()
    console.log('Help & Support pressed')
  }

  const handleSettings = () => {
    onClose()
    console.log('Settings pressed')
  }

  const handleTerms = () => {
    onClose()
    console.log('Terms & Conditions pressed')
  }

  const handleShare = () => {
    onClose()
    console.log('Share App pressed')
  }

  const handleLogout = async () => {
    try {
      onClose()
      await logout()
      console.log('User logged out successfully')
    } catch (error: any) {
      console.error('Logout error:', error)
      Alert.alert(
        'Սխալ',
        'Ելքի ժամանակ սխալ է տեղի ունեցել։ Խնդրում ենք կրկին փորձել։',
        [{ text: 'Լավ' }]
      )
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Menu Items */}
              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={handlePersonalData}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="person" size={20} color={colors.buttonPrimary} />
                  </View>
                  <Text style={styles.menuItemText}>Անձնական տվյալներ</Text>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleLanguages}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="language" size={20} color={colors.buttonPrimary} />
                  </View>
                  <Text style={styles.menuItemText}>Լեզուներ</Text>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleHelpSupport}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="help" size={20} color={colors.buttonPrimary} />
                  </View>
                  <Text style={styles.menuItemText}>Օգնություն և Աջակցություն</Text>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="settings" size={20} color={colors.buttonPrimary} />
                  </View>
                  <Text style={styles.menuItemText}>Կարգավորումներ</Text>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleTerms}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="description" size={20} color={colors.buttonPrimary} />
                  </View>
                  <Text style={styles.menuItemText}>Պայմաններ և Կանոններ</Text>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="share" size={20} color={colors.buttonPrimary} />
                  </View>
                  <Text style={styles.menuItemText}>Կիսել Հավելվածով</Text>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                    <Icon name="logout" size={20} color="#D32F2F" />
                  </View>
                  <Text style={[styles.menuItemText, { color: '#D32F2F' }]}>Ելք</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  menuItems: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
})

