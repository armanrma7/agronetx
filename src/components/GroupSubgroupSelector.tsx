import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/colors'
import Icon from './Icon'
import * as announcementsAPI from '../lib/api/announcements.api'

interface GroupSubgroupSelectorProps {
  selectedGroups: string[]
  selectedSubGroups: string[]
  onGroupsChange: (ids: string[]) => void
  onSubGroupsChange: (ids: string[]) => void
  groupList: announcementsAPI.APICategory[]
  subGroupList: announcementsAPI.APISubcategory[]
  groupListLoading: boolean
  subGroupListLoading: boolean
  catalogLang: announcementsAPI.CatalogLang
  groupLabelKey?: string
  subgroupLabelKey?: string
}

export function GroupSubgroupSelector({
  selectedGroups,
  selectedSubGroups,
  onGroupsChange,
  onSubGroupsChange,
  groupList,
  subGroupList,
  groupListLoading,
  subGroupListLoading,
  catalogLang,
  groupLabelKey = 'addAnnouncement.group',
  subgroupLabelKey = 'addAnnouncement.name',
}: GroupSubgroupSelectorProps) {
  const { t } = useTranslation()
  const [showGroupSheet, setShowGroupSheet] = useState(false)
  const [showSubgroupSheet, setShowSubgroupSheet] = useState(false)
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  const [subgroupSearchQuery, setSubgroupSearchQuery] = useState('')
  const [tempSelectedGroups, setTempSelectedGroups] = useState<string[]>([])
  const [tempSelectedSubGroups, setTempSelectedSubGroups] = useState<string[]>([])

  const filteredGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return groupList
    const q = groupSearchQuery.toLowerCase()
    return groupList.filter(c => {
      const label = announcementsAPI.getCategoryLabelByLang(c, catalogLang).toLowerCase()
      return label.includes(q)
    })
  }, [groupList, groupSearchQuery, catalogLang])

  const filteredSubGroups = useMemo(() => {
    if (!subgroupSearchQuery.trim()) return subGroupList
    const q = subgroupSearchQuery.toLowerCase()
    return subGroupList.filter(s => {
      const label = announcementsAPI.getSubcategoryLabelByLang(s, catalogLang).toLowerCase()
      return label.includes(q)
    })
  }, [subGroupList, subgroupSearchQuery, catalogLang])

  const handleOpenGroupSheet = () => {
    setTempSelectedGroups([...selectedGroups])
    setGroupSearchQuery('')
    setShowGroupSheet(true)
  }

  const handleGroupDone = () => {
    onGroupsChange(tempSelectedGroups)
    setShowGroupSheet(false)
    onSubGroupsChange([])
    if (tempSelectedGroups.length > 0) {
      setTimeout(() => {
        setTempSelectedSubGroups([...selectedSubGroups])
        setSubgroupSearchQuery('')
        setShowSubgroupSheet(true)
      }, 300)
    }
  }

  const handleOpenSubgroupSheet = () => {
    if (selectedGroups.length === 0) return
    setTempSelectedSubGroups([...selectedSubGroups])
    setSubgroupSearchQuery('')
    setShowSubgroupSheet(true)
  }

  const handleSubgroupDone = () => {
    onSubGroupsChange(tempSelectedSubGroups)
    setShowSubgroupSheet(false)
  }

  const toggleGroup = (id: string) => {
    setTempSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSubgroup = (id: string) => {
    setTempSelectedSubGroups(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.skeletonItem}>
          <View style={styles.skeletonCheckbox} />
          <View style={styles.skeletonText} />
        </View>
      ))}
    </View>
  )

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={handleOpenGroupSheet}
        disabled={groupListLoading}
      >
        <View style={styles.selectorButtonContent}>
          <Text style={styles.selectorButtonLabel}>{t(groupLabelKey)}</Text>
          <Text style={styles.selectorButtonCount}>
            {groupListLoading ? `(${t('common.loading')})` : selectedGroups.length > 0 ? `(${selectedGroups.length} ${t('common.selected')})` : ''}
          </Text>
        </View>
        <Icon name="chevronDown" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.selectorButton, selectedGroups.length === 0 && styles.selectorButtonDisabled]}
        onPress={handleOpenSubgroupSheet}
        disabled={selectedGroups.length === 0 || subGroupListLoading}
      >
        <View style={styles.selectorButtonContent}>
          <Text style={[styles.selectorButtonLabel, selectedGroups.length === 0 && styles.selectorButtonLabelDisabled]}>
            {t(subgroupLabelKey)}
          </Text>
          <Text style={styles.selectorButtonCount}>
            {subGroupListLoading ? `(${t('common.loading')})` : selectedSubGroups.length > 0 ? `(${selectedSubGroups.length} ${t('common.selected')})` : ''}
          </Text>
        </View>
        <Icon
          name="chevronDown"
          size={20}
          color={selectedGroups.length === 0 ? colors.textPlaceholder : colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Group sheet */}
      <Modal visible={showGroupSheet} transparent animationType="fade" onRequestClose={() => setShowGroupSheet(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowGroupSheet(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t(groupLabelKey)} {tempSelectedGroups.length > 0 && `(${tempSelectedGroups.length} ${t('common.selected')})`}
              </Text>
              {tempSelectedGroups.length > 0 && (
                <TouchableOpacity onPress={() => setTempSelectedGroups([])}>
                  <Text style={styles.clearButton}>{t('common.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textPlaceholder}
                value={groupSearchQuery}
                onChangeText={setGroupSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {groupSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setGroupSearchQuery('')}>
                  <Icon name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.listContainer}>
              {groupListLoading ? (
                renderSkeleton()
              ) : filteredGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{groupList.length === 0 ? t('common.loading') : t('common.noResults')}</Text>
                </View>
              ) : (
                <FlatList
                  style={{ maxHeight: 400 }}
                  data={filteredGroups}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const isSelected = tempSelectedGroups.includes(item.id)
                    const label = announcementsAPI.getCategoryLabelByLang(item, catalogLang)
                    return (
                      <TouchableOpacity
                        style={[styles.listItem, isSelected && styles.listItemSelected]}
                        onPress={() => toggleGroup(item.id)}
                      >
                        <View style={styles.checkboxContainer}>
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Icon name="check" size={16} color={colors.white} />}
                          </View>
                        </View>
                        <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>{label}</Text>
                      </TouchableOpacity>
                    )
                  }}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
            <View style={styles.doneButtonContainer}>
              <TouchableOpacity style={styles.doneButton} onPress={handleGroupDone}>
                <Text style={styles.doneButtonText}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subgroup sheet */}
      <Modal visible={showSubgroupSheet} transparent animationType="fade" onRequestClose={() => setShowSubgroupSheet(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSubgroupSheet(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t(subgroupLabelKey)} {tempSelectedSubGroups.length > 0 && `(${tempSelectedSubGroups.length} ${t('common.selected')})`}
              </Text>
              {tempSelectedSubGroups.length > 0 && (
                <TouchableOpacity onPress={() => setTempSelectedSubGroups([])}>
                  <Text style={styles.clearButton}>{t('common.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textPlaceholder}
                value={subgroupSearchQuery}
                onChangeText={setSubgroupSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {subgroupSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSubgroupSearchQuery('')}>
                  <Icon name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.listContainer}>
              {subGroupListLoading ? (
                renderSkeleton()
              ) : filteredSubGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {subGroupList.length === 0 ? t('common.loading') : t('common.noResults')}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.subgroupScroll}
                  contentContainerStyle={styles.tilesWrap}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredSubGroups.map((sub) => {
                    const isSelected = tempSelectedSubGroups.includes(sub.id)
                    const label = announcementsAPI.getSubcategoryLabelByLang(sub, catalogLang)
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        style={[styles.tile, isSelected && styles.tileSelected]}
                        onPress={() => toggleSubgroup(sub.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.tileText, isSelected && styles.tileTextSelected]} numberOfLines={2}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              )}
            </View>
            <View style={styles.doneButtonContainer}>
              <TouchableOpacity style={styles.doneButton} onPress={handleSubgroupDone}>
                <Text style={styles.doneButtonText}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 50,
  },
  selectorButtonDisabled: { opacity: 0.5 },
  selectorButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectorButtonLabel: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  selectorButtonLabelDisabled: { color: colors.textPlaceholder },
  selectorButtonCount: { fontSize: 14, color: colors.textSecondary },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitle: { fontSize: 20, fontWeight: '600', color: colors.textPrimary },
  clearButton: { fontSize: 16, color: colors.buttonPrimary, fontWeight: '500' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    gap: 12,
  },
  searchIcon: { color: colors.textSecondary },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary, padding: 0 },
  listContainer: { flex: 1 },
  subgroupScroll: { maxHeight: 400 },
  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  tile: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  tileSelected: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  tileText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  tileTextSelected: {
    color: colors.white,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listItemSelected: { backgroundColor: colors.backgroundSecondary },
  checkboxContainer: { marginRight: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  listItemText: { fontSize: 16, color: colors.textPrimary, flex: 1 },
  listItemTextSelected: { fontWeight: '500' },
  doneButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  doneButton: { backgroundColor: colors.buttonPrimary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  skeletonContainer: { paddingHorizontal: 20 },
  skeletonItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  skeletonCheckbox: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.borderLight },
  skeletonText: { flex: 1, height: 16, borderRadius: 4, backgroundColor: colors.borderLight },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.textSecondary },
})
