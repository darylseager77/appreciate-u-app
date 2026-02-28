'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '100vh', paddingTop: '60px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '60px' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <svg
          className="logo-bounce"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 16px',
            filter: 'drop-shadow(0 4px 12px rgba(79, 70, 229, 0.2))'
          }}
        >
          <circle cx="50" cy="50" r="48" fill="#4f46e5" opacity="0.1"/>
          <path d="M 30 45 Q 30 35, 35 35 Q 40 35, 40 45 Q 40 55, 35 55 Q 30 55, 30 45 Z" fill="#4f46e5"/>
          <path d="M 60 45 Q 60 35, 65 35 Q 70 35, 70 45 Q 70 55, 65 55 Q 60 55, 60 45 Z" fill="#4f46e5"/>
          <path d="M 25 60 Q 50 75, 75 60" stroke="#4f46e5" strokeWidth="4" fill="none" strokeLinecap="round"/>
        </svg>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '8px',
          lineHeight: '1.2'
        }}>
          Welcome! 🎉
        </h1>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
        }}>
          You're successfully logged in
        </p>
      </div>

      {/* User Info Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>
          Your Account
        </h2>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Email
          </div>
          <div style={{ fontSize: '15px', fontWeight: '500' }}>
            {user?.email}
          </div>
        </div>
        {user?.user_metadata?.full_name && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Name
            </div>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>
              {user.user_metadata.full_name}
            </div>
          </div>
        )}
        {user?.user_metadata?.company_name && (
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Company
            </div>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>
              {user.user_metadata.company_name}
            </div>
          </div>
        )}
      </div>

      {/* Success Message */}
      <div className="card" style={{ marginBottom: '24px', background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#15803d' }}>
          Authentication Working!
        </h3>
        <p style={{ fontSize: '14px', color: '#166534' }}>
          Your Supabase connection is set up correctly. The signup, login, and session management are all working.
        </p>
      </div>

      {/* Coming Soon */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          🚀 Coming Next
        </h3>
        <ul style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>25-question appreciation quiz</li>
          <li>Your appreciation profile</li>
          <li>Team member dashboard</li>
          <li>Manager dashboard with insights</li>
          <li>Check-in system</li>
        </ul>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="btn"
        style={{
          width: '100%',
          background: 'white',
          border: '2px solid var(--border)',
          color: 'var(--text-primary)'
        }}
      >
        Log Out
      </button>
    </div>
  )
}
