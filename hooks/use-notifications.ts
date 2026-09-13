"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api"
import type { AppNotification } from "@/lib/types"

const POLL_INTERVAL = 30_000

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    const data = await listNotifications()
    if (mountedRef.current) setNotifications(data)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetch().finally(() => {
      if (mountedRef.current) setLoading(false)
    })
    const id = setInterval(fetch, POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      clearInterval(id)
    }
  }, [fetch])

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    try {
      await markNotificationRead(id)
    } catch {
      // revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      )
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await markAllNotificationsRead()
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: false })))
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, loading, markRead, markAllRead }
}
