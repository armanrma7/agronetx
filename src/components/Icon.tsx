import React from 'react'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import { TextStyle } from 'react-native'

type Props = {
  name: string
  size?: number
  style?: TextStyle | TextStyle[]
  color?: string
}

const ICON_MAP: Record<string, string> = {
  email: 'email',
  whatsapp: 'chat',
  viber: 'message',
  telegram: 'send',
  chevronDown: 'keyboard-arrow-down',
  eye: 'visibility',
  eyeOff: 'visibility-off',
  check: 'check',
  phone: 'phone',
  search: 'search',
  menu: 'menu',
  repeat: 'repeat',
  build: 'build',
  key: 'vpn-key',
  bookmark: 'bookmark',
  'bookmark-border': 'bookmark-border',
  people: 'people',
  home: 'home',
  add: 'add',
  notifications: 'notifications',
  campaign: 'campaign',
  person: 'person',
  filter: 'tune',
  close: 'close',
  calendar: 'calendar-today',
  location: 'location-on',
  info: 'info-outline',
  document: 'description',
  image: 'image',
  favorite: 'favorite',
  'favorite-border': 'favorite-border',
  'arrow-back': 'arrow-back',
  'keyboard-arrow-down': 'keyboard-arrow-down',
  'chevron-right': 'keyboard-arrow-right',
  language: 'language',
  help: 'help-outline',
  share: 'share',
  logout: 'logout',
  settings: 'settings',
  visibility: 'visibility',
  description: 'description',
}

export function Icon({ name, size = 18, style, color }: Props) {
  const iconName = ICON_MAP[name] || name
  const iconColor = color || (Array.isArray(style) ? undefined : style?.color) || '#1A1A1A'
  
  return (
    <MaterialIcons
      name={iconName}
      size={size}
      color={iconColor}
      style={style}
    />
  )
}

export default Icon
