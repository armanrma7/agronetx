import apiClient from './client'

export interface NotificationItem {
  id: string
  title?: string
  body?: string
  message?: string
  is_seen: boolean
  created_at: string
  type?: string
  data?: Record<string, any>
}

export interface GetNotificationsParams {
  page?: number
  limit?: number
  is_seen?: boolean
  signal?: AbortSignal
}

export async function getNotificationsAPI(params: GetNotificationsParams = {}): Promise<{
  notifications: NotificationItem[]
  total: number
  page: number
}> {
  const { signal, ...rest } = params
  const response = await apiClient.get('/notifications', { params: rest, signal })
  return response.data
}

export async function getUnreadCountAPI(): Promise<{ count: number }> {
  const response = await apiClient.get('/notifications/unread-count')
  return response.data
}

export async function markNotificationSeenAPI(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/seen`)
}
