import { colors } from '../../../theme/colors'

export function formatDate(
  dateString: string | undefined,
  t: (key: string) => string,
): string {
  if (!dateString) return t('common.notSpecified')
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return t('common.notSpecified')
  const monthKeys = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ]
  const month = t(`months.${monthKeys[date.getMonth()]}`)
  return `${date.getDate()} ${month} ${date.getFullYear()}`
}

export function getStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  switch (status?.toLowerCase()) {
    case 'pending':
    case 'in_progress':
    case 'in progress':
      return t('applications.statusInProgress')
    case 'approved':
    case 'accepted':
      return t('applications.statusApproved')
    case 'rejected':
      return t('applications.statusRejected')
    case 'blocked':
      return t('applications.statusBlocked')
    case 'closed':
    case 'cancelled':
    case 'canceled':
      return t('applications.statusClosed')
    default:
      return status || t('applications.statusInProgress')
  }
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'accepted':
      return colors.success
    case 'rejected':
      return colors.error
    case 'blocked':
      return colors.textTertiary
    case 'closed':
    case 'cancelled':
    case 'canceled':
      return colors.textTertiary
    default:
      return colors.warning
  }
}

/** Returns true for any terminal/closed status (no further actions possible). */
export function isTerminalStatus(s?: string): boolean {
  return /^(closed|cancelled|canceled|rejected|blocked)$/i.test((s || '').trim())
}

/** Returns true for any canceled-family status. */
export function isClosedStatus(s?: string): boolean {
  return /^(closed|cancelled|canceled)$/i.test((s || '').trim())
}
