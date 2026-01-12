'use client'

import { useEffect } from 'react'
import { identifyUser } from '@/lib/analytics'

interface PostHogIdentifyProps {
  userId: string
  email?: string
  role?: string
  unitId?: string
  unitName?: string
}

export function PostHogIdentify({
  userId,
  email,
  role,
  unitId,
  unitName,
}: PostHogIdentifyProps) {
  useEffect(() => {
    identifyUser(userId, { email, role, unitId, unitName })
  }, [userId, email, role, unitId, unitName])

  return null
}
