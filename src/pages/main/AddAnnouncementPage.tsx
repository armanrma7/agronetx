import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { AddAnnouncementModal } from '../../components/AddAnnouncementModal'
import { AnnouncementType } from '../../types'

export function AddAnnouncementPage() {
  const navigation = useNavigation()
  const [modalVisible, setModalVisible] = useState(true)

  const handleSelectType = (type: AnnouncementType) => {
    setModalVisible(false)
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate('NewAnnouncementForm', { type })
    } else {
      ;(navigation as any).navigate('NewAnnouncementForm', { type })
    }
  }

  const handleClose = () => {
    setModalVisible(false)
    navigation.goBack()
  }

  return (
    <View style={styles.container}>
      <AddAnnouncementModal
        visible={modalVisible}
        onClose={handleClose}
        onSelectType={handleSelectType}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

