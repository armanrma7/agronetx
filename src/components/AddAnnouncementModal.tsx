import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/colors'
import { AnnouncementType } from '../types'
import Icon from './Icon'

interface AddAnnouncementModalProps {
  visible: boolean
  onClose: () => void
  onSelectType: (type: AnnouncementType) => void
}

export function AddAnnouncementModal({ visible, onClose, onSelectType }: AddAnnouncementModalProps) {
  const { t } = useTranslation()
  
  const handleSelect = (type: AnnouncementType) => {
    onSelectType(type)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />
            
            {/* Title */}
            <Text style={styles.modalTitle}>{t('addAnnouncement.title')}</Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleSelect('goods')}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.iconContainer}>
                    <Icon name="compare-arrows" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.optionText}>{t('addAnnouncement.product')}</Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleSelect('service')}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.iconContainer}>
                    <Icon name="build" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.optionText}>{t('addAnnouncement.service')}</Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleSelect('rent')}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.iconContainer}>
                    <Icon name="vpn-key" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.optionText}>{t('addAnnouncement.rent')}</Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 52,
  },
})

