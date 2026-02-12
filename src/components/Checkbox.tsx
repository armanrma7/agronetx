import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import Icon from './Icon'

type Props = {
  label: string
  checked: boolean
  onToggle: (v: boolean) => void
  onLabelPress?: () => void
  error?: string
}

export function Checkbox({
  label,
  checked,
  onToggle,
  onLabelPress,
  error,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.box, checked && styles.boxChecked]}
          onPress={() => onToggle(!checked)}
          activeOpacity={0.7}
        >
          {checked && <Icon name="check" size={14} color={colors.white} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onLabelPress}
          activeOpacity={0.7}
          disabled={!onLabelPress}
        >
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  error: {
    color: colors.errorDark,
    fontSize: 12,
    marginTop: 4,
  },
})
