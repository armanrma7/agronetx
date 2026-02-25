import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { AppHeader } from '../../components/AppHeader'
import Icon from '../../components/Icon'
import supportData from '../../utils/support.json'

/* ---------- Types ---------- */

interface ChildItem {
  title: string
  content: string
}

interface SectionItem {
  title: string
  children?: ChildItem[]
  content?: string
}

/* ---------- Q&A Accordion (leaf level) ---------- */

interface QAItemProps {
  title: string
  content: string
}

const QAItem = React.memo(({ title, content }: QAItemProps) => {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.qaItem}>
      <TouchableOpacity
        style={styles.qaHeader}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.qaTitle}>{title}</Text>
        <Icon
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.qaBody}>
          <Text style={styles.qaContent}>{content}</Text>
        </View>
      )}
    </View>
  )
})

/* ---------- Section Accordion (parent level with children) ---------- */

interface SectionAccordionProps {
  title: string
  children: ChildItem[]
}

const SectionAccordion = React.memo(({ title, children }: SectionAccordionProps) => {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIcon}>
            <Icon name="help" size={18} color={colors.buttonPrimary} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Icon
          name={open ? 'keyboard-arrow-down' : 'chevron-right'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.sectionContent}>
          {children.map((item, idx) => (
            <QAItem key={idx} title={item.title} content={item.content} />
          ))}
        </View>
      )}
    </View>
  )
})

/* ---------- Contact Card (flat content item) ---------- */

interface ContactCardProps {
  title: string
  content: string
  isSendEmail?: boolean
}

const ContactCard = React.memo(({ title, content, isSendEmail }: ContactCardProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const handleEmail = useCallback(() => {
    Linking.openURL('mailto:support@agronetx.am')
  }, [])

  const handlePhone = useCallback(() => {
    Linking.openURL('tel:+37400000000')
  }, [])

  const icon = isSendEmail ? 'mail' : 'contact-support'

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, isSendEmail && styles.sectionIconMail]}>
            <Icon name={icon} size={18} color={isSendEmail ? colors.white : colors.buttonPrimary} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Icon
          name={open ? 'keyboard-arrow-down' : 'chevron-right'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.sectionContent}>
          <Text style={styles.contactText}>{content}</Text>

          {isSendEmail ? (
            <TouchableOpacity style={styles.emailBtn} onPress={handleEmail} activeOpacity={0.8}>
              <Icon name="mail" size={18} color={colors.white} />
              <Text style={styles.emailBtnText}>{t('help.sendEmail')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.contactActionBtn} onPress={handlePhone} activeOpacity={0.8}>
                <Icon name="phone" size={18} color={colors.buttonPrimary} />
                <Text style={styles.contactActionText}>{t('help.call')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactActionBtn} onPress={handleEmail} activeOpacity={0.8}>
                <Icon name="mail" size={18} color={colors.buttonPrimary} />
                <Text style={styles.contactActionText}>{t('help.email')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  )
})

/* ---------- Main Page ---------- */

export function HelpPage() {
  const { t } = useTranslation()
  const items: SectionItem[] = supportData.items

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader showBack />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>{t('help.title')}</Text>
          <Text style={styles.faqTitle}>{supportData.title}</Text>

          {items.map((item, idx) => {
            if (item.children && item.children.length > 0) {
              return (
                <SectionAccordion
                  key={idx}
                  title={item.title}
                  children={item.children}
                />
              )
            }

            const isSendEmail = item.title.toUpperCase().includes('SEND EMAIL')
            return (
              <ContactCard
                key={idx}
                title={item.title}
                content={item.content ?? ''}
                isSendEmail={isSendEmail}
              />
            )
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.buttonPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  faqTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 20,
  },

  /* Section accordion */
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionIconMail: {
    backgroundColor: colors.buttonPrimary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  /* Q&A item */
  qaItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  qaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  qaTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  qaBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  qaContent: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  /* Contact card */
  contactText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contactActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
    borderRadius: 25,
    paddingVertical: 10,
  },
  contactActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 25,
    height: 46,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  emailBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
})
