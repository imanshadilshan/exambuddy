'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCurrentUser, setCredentials } from '@/lib/redux/slices/authSlice'

export default function AuthInitializer() {
  const dispatch = useAppDispatch()
  const { accessToken, refreshToken, user } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!accessToken) {
      const storedAccessToken = localStorage.getItem('accessToken')
      const storedRefreshToken = localStorage.getItem('refreshToken')

      if (storedAccessToken && storedRefreshToken) {
        dispatch(setCredentials({
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
        }))
      }
    }
  }, [accessToken, dispatch])

  useEffect(() => {
    // If we have a token but no user data, fetch the user
    if (accessToken && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [accessToken, user, dispatch, refreshToken])

  return null
}
