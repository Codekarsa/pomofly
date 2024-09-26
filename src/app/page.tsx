'use client'

import { useEffect, useState } from 'react'
import { User } from "firebase/auth"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from '../lib/firebase'
import SignIn from '../components/SignIn'
import Dashboard from '../components/Dashboard'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
    })
    return () => unsubscribe()
  }, [])

  return (
    <main className="min-h-screen bg-gray-100">
      {user ? <Dashboard /> : <SignIn />}
    </main>
  )
}