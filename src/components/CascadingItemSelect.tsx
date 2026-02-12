import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors } from '../theme/colors'
import { Select } from './Select'
import type { Category, SubCategory, Item, SupportedLang } from '../types/items'

export interface SelectOption {
  value: string
  label: string
}

export const getLabelByLang = (
  label: { hy: string; ru: string; en: string } | undefined,
  currentLang: SupportedLang
) => {
  return label?.[currentLang] ?? label?.hy ?? label?.en ?? label?.ru ?? ''
}

export const categoriesToOptions = (categories: Category[], currentLang: SupportedLang): SelectOption[] =>
  categories.map((c) => ({ value: c.id, label: getLabelByLang(c.label, currentLang) }))

export const subCategoriesToOptions = (
  subCategories: SubCategory[] | undefined,
  currentLang: SupportedLang
): SelectOption[] => (subCategories ?? []).map((sc) => ({ value: sc.id, label: getLabelByLang(sc.label, currentLang) }))

export const itemsToOptions = (items: Item[] | undefined, currentLang: SupportedLang): SelectOption[] =>
  (items ?? []).map((it) => ({ value: it.id, label: getLabelByLang(it.label, currentLang) }))

interface Props {
  categories: Category[]
  currentLang: SupportedLang

  categoryId: string
  subCategoryId: string
  itemId: string

  onCategoryChange: (categoryId: string) => void
  onSubCategoryChange: (subCategoryId: string) => void
  onItemChange: (itemId: string) => void
  onUnitChange: (unitCode: string) => void

  labels?: {
    category?: string
    subCategory?: string
    item?: string
  }
}

export function CascadingItemSelect({
  categories,
  currentLang,
  categoryId,
  subCategoryId,
  itemId,
  onCategoryChange,
  onSubCategoryChange,
  onItemChange,
  onUnitChange,
  labels,
}: Props) {
  const categoryOptions = useMemo(() => categoriesToOptions(categories, currentLang), [categories, currentLang])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  )

  const subCategoryOptions = useMemo(
    () => subCategoriesToOptions(selectedCategory?.sub_categories, currentLang),
    [selectedCategory?.sub_categories, currentLang]
  )

  const selectedSubCategory = useMemo(
    () => selectedCategory?.sub_categories?.find((sc) => sc.id === subCategoryId),
    [selectedCategory?.sub_categories, subCategoryId]
  )

  const itemOptions = useMemo(
    () => itemsToOptions(selectedSubCategory?.items, currentLang),
    [selectedSubCategory?.items, currentLang]
  )

  const handleCategoryChange = (nextCategoryId: string) => {
    onCategoryChange(nextCategoryId)
    onSubCategoryChange('')
    onItemChange('')
    onUnitChange('')
  }

  const handleSubCategoryChange = (nextSubCategoryId: string) => {
    onSubCategoryChange(nextSubCategoryId)
    onItemChange('')
    onUnitChange('')
  }

  const handleItemChange = (nextItemId: string) => {
    onItemChange(nextItemId)
    const selectedItem = selectedSubCategory?.items?.find((it) => it.id === nextItemId)
    onUnitChange(selectedItem?.unit?.code ?? '')
  }

  return (
    <View style={styles.container}>
      <Select
        label={labels?.category ?? 'Կատեգորիա'}
        value={categoryId}
        onValueChange={handleCategoryChange}
        options={categoryOptions}
        placeholder=""
      />

      {!!categoryId && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{labels?.subCategory ?? 'Ենթախումբ'}</Text>
          <View style={styles.tilesWrap}>
            {subCategoryOptions.map((opt) => {
              const selected = opt.value === subCategoryId
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.tile, selected ? styles.tileSelected : styles.tileUnselected]}
                  onPress={() => handleSubCategoryChange(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tileText, selected ? styles.tileTextSelected : styles.tileTextUnselected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {!!subCategoryId && (
        <View style={styles.section}>
          <Select
            label={labels?.item ?? 'Ապրանք'}
            value={itemId}
            onValueChange={handleItemChange}
            options={itemOptions}
            placeholder=""
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: colors.textTile,
    marginBottom: 7,
  },
  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  tileSelected: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  tileUnselected: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  tileText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tileTextSelected: {
    color: colors.white,
  },
  tileTextUnselected: {
    color: colors.textPrimary,
  },
})


