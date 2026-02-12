/**
 * Color palette for AgronetX app
 * All colors used throughout the application should be defined here
 */

export const colors = {
  // Primary colors
  primary: '#0066CC',
  primaryDark: '#0052A3',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundDim: 'rgba(0, 0, 0, 0.5)',
  
  // Text colors
  textPrimary: '#1A1A1A',
  textSecondary: '#4B5563',
  textTertiary: '#666666',
  textPlaceholder: '#999999',
  textLight: '#ADAEBC',
  textInfo: '#6F6F6F',
  textTile: '#374151',
  
  // Border colors
  border: '#E0E0E0',
  borderLight: '#E5E7EB',
  borderInput: '#ADAEBC',
  
  // Error colors
  error: '#DC3545',
  errorDark: '#DC2626',
  
  // Button colors
  buttonPrimary: '#2E5984',
  buttonSecondary: 'transparent',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Note: success color is used for success messages
  
  // Other
  white: '#FFFFFF',
  black: '#000000',
  darkGray: '#111827',
} as const

// Type for color keys
export type ColorKey = keyof typeof colors

