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

interface AnnouncementSubtypeModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (subtype: string) => void
  announcementType: AnnouncementType
}

export function AnnouncementSubtypeModal({ 
  visible, 
  onClose, 
  onSelect, 
  announcementType 
}: AnnouncementSubtypeModalProps) {
  const { t } = useTranslation()

  const getOptions = () => {
    switch (announcementType) {
      case 'goods':
        return [
          { value: 'sell', label: t('announcementSubtype.sellGoods') },
          { value: 'buy', label: t('announcementSubtype.buyGoods') },
        ]
      case 'service':
        return [
          { value: 'offer', label: t('announcementSubtype.serviceOffer') },
          { value: 'requirement', label: t('announcementSubtype.serviceRequirement') },
        ]
      case 'rent':
        return [
          { value: 'offer', label: t('announcementSubtype.rentOffer') },
          { value: 'requirement', label: t('announcementSubtype.rentRequirement') },
        ]
      default:
        return []
    }
  }

  const options = getOptions()

  const handleSelect = (value: string) => {
    onSelect(value)
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
            <Text style={styles.modalTitle}>{t('announcementSubtype.title')}</Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {options.map((option, index) => (
                <React.Fragment key={option.value}>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                  </TouchableOpacity>
                  {index < options.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
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
  optionText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
})

