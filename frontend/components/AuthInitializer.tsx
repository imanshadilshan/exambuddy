'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCurrentUser } from '@/lib/redux/slices/authSlice'

export default function AuthInitializer() {
  const dispatch = useAppDispatch()
  const { accessToken, user } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // If we have a token but no user data, fetch the user
    if (accessToken && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [accessToken, user, dispatch])

  return null
}
