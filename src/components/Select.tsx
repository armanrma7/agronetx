import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput } from 'react-native'
import { colors } from '../theme/colors'
import Icon from './Icon'

interface SelectOption {
  value: string
  label: string
  icon?: string
  isHeader?: boolean
  headerLabel?: string
}

interface SelectProps {
  label?: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
}

export function Select({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Ընտրել',
  required = false,
  error,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Փնտրել...',
}: SelectProps) {
  const [modalVisible, setModalVisible] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  // Only find selected option among non-header items
  const selectedOption = options.find(opt => !opt.isHeader && opt.value === value)

  // Filter options based on search query (search both header and item names)
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options
    
    const query = searchQuery.toLowerCase()
    const filtered: SelectOption[] = []
    let currentHeader: SelectOption | null = null

    options.forEach(option => {
      if (option.isHeader) {
        currentHeader = option
      } else {
        // Check if item or its header matches search
        const itemMatches = option.label.toLowerCase().includes(query)
        const headerMatches = option.headerLabel?.toLowerCase().includes(query) || false
        
        if (itemMatches || headerMatches) {
          // Add header if not already added
          if (currentHeader && !filtered.includes(currentHeader)) {
            filtered.push(currentHeader)
          }
          filtered.push(option)
        }
      }
    })

    return filtered
  }, [options, searchQuery])

  const handleClose = () => {
    setModalVisible(false)
    setSearchQuery('')
  }

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.select, disabled && styles.selectDisabled, error && styles.selectError]}
        onPress={() => {
          if (disabled) return
          setModalVisible(true)
        }}
        activeOpacity={disabled ? 1 : 0.7}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text style={[styles.selectText, !selectedOption && styles.placeholder]}>
          {selectedOption ? (
            selectedOption.icon ? (
              <>
                <Icon name={selectedOption.icon} size={24} style={styles.optionIcon} />{' '}
                {selectedOption.headerLabel ? `${selectedOption.headerLabel} • ${selectedOption.label}` : selectedOption.label}
              </>
            ) : (
              selectedOption.headerLabel ? `${selectedOption.headerLabel} • ${selectedOption.label}` : selectedOption.label
            )
          ) : (
            placeholder
          )}
        </Text>
        {!disabled && <Icon name="chevronDown" size={24} style={styles.arrow} />}
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            {searchable && (
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textPlaceholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Icon name="close" size={20} style={styles.clearIcon} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => `${item.value}_${index}`}
              renderItem={({ item, index }) => {
                // Render header (non-selectable)
                if (item.isHeader) {
                  return (
                    <View style={styles.headerOption}>
                      <Text style={styles.headerText}>{item.label}</Text>
                    </View>
                  )
                }

                // Render selectable option (item)
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      item.value === value && styles.optionSelected,
                    ]}
                    onPress={() => {
                      onValueChange(item.value)
                      handleClose()
                    }}
                  >
                    {item.icon && <Icon name={item.icon} size={24} style={styles.optionIcon} />}
                    <Text 
                      style={[
                        styles.optionText,
                        item.value === value && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.value === value && (
                      <Icon name="check" size={20} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Արդյունքներ չեն գտնվել</Text>
                </View>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textTile,
    marginBottom: 7,
  },
  required: {
    color: colors.error,
  },
  select: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 50,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  selectDisabled: {
    backgroundColor: colors.backgroundSecondary,
    opacity: 0.8,
  },
  selectError: {
    borderColor: colors.error,
  },
  selectText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholder: {
    color: colors.textPlaceholder,
  },
  arrow: {
    // fontSize: 12,
    color: colors.textTertiary,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.backgroundDim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.backgroundSecondary,
  },
  optionIcon: {
    // fontSize: 20,
    marginRight: 16,
  },
  optionText: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkIcon: {
    color: colors.primary,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  searchIcon: {
    color: colors.textTertiary,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  clearIcon: {
    color: colors.textTertiary,
    marginLeft: 8,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerOption: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.backgroundSecondary,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
})
