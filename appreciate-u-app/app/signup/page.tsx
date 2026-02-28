'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      })

      if (signUpError) throw signUpError

      // Success! Redirect to a welcome or dashboard page
      alert('Account created! Check your email to verify your account.')
      router.push('/login')
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup')
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
          Create Your Account
        </h1>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
        }}>
          Start understanding how your people want to be valued
        </p>
      </div>

      {/* Signup Form */}
      <div className="card">
        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '6px',
              color: 'var(--text-primary)'
            }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                outline: 'none',
              }}
              placeholder="Jane Doe"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '6px',
              color: 'var(--text-primary)'
            }}>
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                outline: 'none',
              }}
              placeholder="Acme Inc"
            />
          </div>

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
              minLength={6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                outline: 'none',
              }}
              placeholder="At least 6 characters"
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          Already have an account?{' '}
          <Link
            href="/login"
            style={{
              color: 'var(--primary)',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
