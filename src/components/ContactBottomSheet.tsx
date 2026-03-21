import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
} from 'react-native'
import { colors } from '../theme/colors'
import Icon from './Icon'

export type ContactSheetRow = { label: string; value: string }

export interface ContactBottomSheetProps {
  visible: boolean
  onClose: () => void
  /** Header title (e.g. t('profile.contactDetails')) */
  title: string
  displayName: string
  /** Subtitle under name (e.g. farmer / organization) */
  roleLabel: string
  avatarUri?: string | null
  /** Label + value rows (phone, region, …) */
  rows: ContactSheetRow[]
  /** If non-empty after trim, shows full-width Call button */
  phone?: string
  callButtonLabel: string
  callFailedMessage?: string
}

function initialsFromFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : ''
  return (first + last).toUpperCase()
}

/**
 * Shared bottom-sheet style contact panel (fade + sheet from bottom).
 * Used on announcement detail (owner contact) and application detail (applicant contact).
 */
export function ContactBottomSheet({
  visible,
  onClose,
  title,
  displayName,
  roleLabel,
  avatarUri,
  rows,
  phone,
  callButtonLabel,
  callFailedMessage,
}: ContactBottomSheetProps) {
  const initials = initialsFromFullName(displayName || '')
  const dial = (phone || '').trim().replace(/\s/g, '')

  const handleCall = () => {
    if (!dial) return
    Linking.openURL(`tel:${dial}`).catch(() => {
      if (callFailedMessage) {
        Alert.alert('', callFailedMessage)
      }
    })
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.profile}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <Text style={styles.name}>{displayName.trim() ? displayName : '-'}</Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </View>

          <View style={styles.infoBlock}>
            {rows.map((row, i) => (
              <View key={`${row.label}-${i}`} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue} selectable={!!row.value && row.value !== '-'}>
                  {row.value?.trim() ? row.value : '-'}
                </Text>
              </View>
            ))}
          </View>

          {dial ? (
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCall}
              accessibilityRole="button"
              accessibilityLabel={callButtonLabel}
            >
              <Icon name="phone" size={20} color={colors.white} />
              <Text style={styles.callButtonText}>{callButtonLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    paddingRight: 12,
  },
  profile: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  role: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoBlock: {
    marginBottom: 24,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
})
