import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native'
import { colors } from '../theme/colors'
import Icon from './Icon'

interface InputProps {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  note?: string
  showPasswordToggle?: boolean
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  error,
  note,
  showPasswordToggle = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Icon
              name={isPasswordVisible ? 'eye' : 'eyeOff'}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
      {/* {error && <Text style={styles.errorText}>{error}</Text>} */}
      {note && !error && <Text style={styles.noteText}>{note}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: 14,
    color: colors.textTile,
    marginBottom: 7,
  },
  required: {
    color: colors.error,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    height: 56,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: 50,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.error,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 4,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.error,
  },
  noteText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textLight,
  },
})

