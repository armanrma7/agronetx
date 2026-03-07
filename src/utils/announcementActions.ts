/**
 * Announcement & Application Action Utilities
 *
 * Pure, fully-typed helpers that derive available actions from backend status values.
 * All pages and components import from here — logic is never duplicated.
 *
 * Backend statuses (exact values returned by API):
 *   Announcement: TO_BE_VERIFIED | PUBLISHED | CLOSED | CANCELED | BLOCKED
 *   Application:  PENDING | APPROVED | REJECTED | CANCELED | BLOCKED
 */

import { Announcement } from '../types'
import type { ApplicationListItem } from '../lib/api/announcements.api'

// ── Status matchers ──────────────────────────────────────────────────────────
// All matchers are case-insensitive and handle legacy spellings (published, accepted, etc.)

export const announcementIs = {
  toBeVerified: (s?: string) => /^to_be_verified$/i.test((s || '').trim()),
  /** Canonical status for live announcements; 'active' accepted from API for backward compat */
  active:       (s?: string) => /^(published|active)$/i.test((s || '').trim()),
  closed:       (s?: string) => /^closed$/i.test((s || '').trim()),
  canceled:     (s?: string) => /^cancel(l?ed)$/i.test((s || '').trim()),
  blocked:      (s?: string) => /^blocked$/i.test((s || '').trim()),
}

export const applicationIs = {
  pending:  (s?: string) => /^pending$/i.test((s || '').trim()),
  /** 'accepted' is a legacy synonym for APPROVED */
  approved: (s?: string) => /^(approved|accepted)$/i.test((s || '').trim()),
  rejected: (s?: string) => /^rejected$/i.test((s || '').trim()),
  canceled: (s?: string) => /^cancel(l?ed)$/i.test((s || '').trim()),
  blocked:  (s?: string) => /^blocked$/i.test((s || '').trim()),
}

// ── Ownership ────────────────────────────────────────────────────────────────

export function isAnnouncementOwner(
  announcement: Announcement,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false
  return String(announcement.owner_id) === String(userId)
}

// ── Announcement-level actions ────────────────────────────────────────────────

/**
 * Cases 1, 2a, 2b, 2c:
 * Announcer can cancel when status is TO_BE_VERIFIED or PUBLISHED.
 */
export function canCancelAnnouncement(
  announcement: Announcement,
  userId: string | null | undefined,
): boolean {
  if (!isAnnouncementOwner(announcement, userId)) return false
  return (
    announcementIs.toBeVerified(announcement.status) ||
    announcementIs.active(announcement.status)
  )
}

/**
 * Case 2c:
 * Announcer can close announcement when PUBLISHED and at least one application is APPROVED.
 */
export function canCloseAnnouncement(
  announcement: Announcement,
  userId: string | null | undefined,
  hasAnyApprovedApplication: boolean,
): boolean {
  if (!isAnnouncementOwner(announcement, userId)) return false
  if (!announcementIs.active(announcement.status)) return false
  return hasAnyApprovedApplication
}

/**
 * Cases 2a, 2b, 2c, 2d, 2e:
 * Non-owner can apply or re-apply based on announcement and own application status.
 *
 * Rules:
 * - Announcement must be PUBLISHED
 * - My application is APPROVED → can apply again (Case 2c applicant side)
 * - Another user's application is APPROVED (mine isn't) → cannot apply (Case 2c)
 * - My application is PENDING → cannot apply again
 * - My application is BLOCKED → cannot apply
 * - No application, or REJECTED/CANCELED → can apply
 */
export function canApplyOrApplyAgain(
  announcement: Announcement,
  userId: string | null | undefined,
  myApplication: ApplicationListItem | null,
  hasAnyApprovedApplication: boolean,
): boolean {
  if (!userId) return false
  if (isAnnouncementOwner(announcement, userId)) return false
  if (!announcementIs.active(announcement.status)) return false

  // My app is APPROVED → "Apply Again" is available even though a general approved app exists
  if (myApplication && applicationIs.approved(myApplication.status)) return true

  // Someone else's app is approved → others cannot apply
  if (hasAnyApprovedApplication) return false

  // No application → can apply
  if (!myApplication) return true

  // PENDING → cannot re-apply
  if (applicationIs.pending(myApplication.status)) return false

  // BLOCKED → cannot apply
  if (applicationIs.blocked(myApplication.status)) return false

  // REJECTED or CANCELED → can apply again (Cases 2d, 2e)
  return true
}

/**
 * Returns true when the "Apply Again" text variant should be shown instead of "Apply".
 */
export function isReapply(myApplication: ApplicationListItem | null): boolean {
  if (!myApplication) return false
  return (
    applicationIs.rejected(myApplication.status) ||
    applicationIs.canceled(myApplication.status) ||
    applicationIs.approved(myApplication.status)
  )
}

/**
 * Contact visibility rule (announcement detail — for applicant's "Contact" button):
 * - Announcement must be PUBLISHED or CLOSED
 * - AND the current user must have an APPROVED application
 */
export function canApplicantViewContacts(
  announcement: Announcement,
  userId: string | null | undefined,
  myApplication: ApplicationListItem | null,
): boolean {
  if (isAnnouncementOwner(announcement, userId)) return false
  if (
    !announcementIs.active(announcement.status) &&
    !announcementIs.closed(announcement.status)
  ) return false
  if (!myApplication) return false
  return applicationIs.approved(myApplication.status)
}

// ── Application-level actions ─────────────────────────────────────────────────

/**
 * Case 2b: Announcer can APPROVE when announcement is PUBLISHED + application is PENDING.
 */
export function canApproveApplication(
  announcementStatus: string,
  application: ApplicationListItem,
  isAnnouncerUser: boolean,
): boolean {
  if (!isAnnouncerUser) return false
  if (!announcementIs.active(announcementStatus)) return false
  return applicationIs.pending(application.status)
}

/**
 * Cases 2b, 2c: Announcer can REJECT when application is PENDING or APPROVED.
 */
export function canRejectApplication(
  announcementStatus: string,
  application: ApplicationListItem,
  isAnnouncerUser: boolean,
): boolean {
  if (!isAnnouncerUser) return false
  if (!announcementIs.active(announcementStatus)) return false
  return (
    applicationIs.pending(application.status) ||
    applicationIs.approved(application.status)
  )
}

/**
 * Cases 2b, 2c: Applicant can CANCEL their own PENDING or APPROVED application.
 */
export function canCancelApplication(
  announcementStatus: string,
  application: ApplicationListItem,
  currentUserId: string | null | undefined,
): boolean {
  const isOwner =
    currentUserId != null &&
    String(application.user_id) === String(currentUserId)
  if (!isOwner) return false
  if (!announcementIs.active(announcementStatus)) return false
  return (
    applicationIs.pending(application.status) ||
    applicationIs.approved(application.status)
  )
}

/**
 * Case 2b: Applicant can EDIT their own application only when it is PENDING.
 */
export function canEditApplication(
  announcementStatus: string,
  application: ApplicationListItem,
  currentUserId: string | null | undefined,
): boolean {
  const isOwner =
    currentUserId != null &&
    String(application.user_id) === String(currentUserId)
  if (!isOwner) return false
  if (!announcementIs.active(announcementStatus)) return false
  return applicationIs.pending(application.status)
}

/**
 * Cases 2c, 2d, 2e: Applicant can re-apply from application detail.
 * - APPROVED → apply again
 * - REJECTED → apply again
 * - CANCELED → apply again
 */
export function canApplyAgainFromApplication(
  announcementStatus: string,
  application: ApplicationListItem,
  currentUserId: string | null | undefined,
): boolean {
  const isOwner =
    currentUserId != null &&
    String(application.user_id) === String(currentUserId)
  if (!isOwner) return false
  if (!announcementIs.active(announcementStatus)) return false
  return (
    applicationIs.approved(application.status) ||
    applicationIs.rejected(application.status) ||
    applicationIs.canceled(application.status)
  )
}

/**
 * Announcer contact visibility in ApplicationDetailPage:
 * Announcement is PUBLISHED or CLOSED AND application is APPROVED.
 */
export function canAnnouncerViewApplicantContact(
  announcementStatus: string,
  application: ApplicationListItem,
  isAnnouncerUser: boolean,
): boolean {
  if (!isAnnouncerUser) return false
  if (
    !announcementIs.active(announcementStatus) &&
    !announcementIs.closed(announcementStatus)
  ) return false
  return applicationIs.approved(application.status)
}
