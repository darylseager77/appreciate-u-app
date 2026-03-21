'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // Redirect based on role
      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('id', data.user?.id).single()
      if (profileData?.role === 'manager') {
        router.push('/manager')
      } else {
        router.push('/team-member')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
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
          Welcome Back
        </h1>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
        }}>
          Log in to your account
        </p>
      </div>

      {/* Login Form */}
      <div className="card">
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '6px',
              color: 'var(--text-primary)'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                outline: 'none',
              }}
              placeholder="jane@company.com"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '6px',
              color: 'var(--text-primary)'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                outline: 'none',
              }}
              placeholder="Your password"
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '20px',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          Don't have an account?{' '}
          <Link
            href="/signup"
            style={{
              color: 'var(--primary)',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
