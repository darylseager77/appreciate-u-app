'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface AppreciationProfile {
  quality_time: number
  recognition: number
  support: number
  rewards: number
  inclusion: number
}

const languageInfo = {
  quality_time: {
    emoji: '⏰',
    name: 'Quality Time',
    description: 'You feel most valued when your manager or teammates spend dedicated time with you - whether that\'s regular check-ins, grabbing coffee, or having deep conversations about your work and growth.',
    color: '#8b5cf6'
  },
  recognition: {
    emoji: '🌟',
    name: 'Recognition',
    description: 'Verbal acknowledgment matters to you. You appreciate when people thank you, recognise your contributions publicly or privately, and give you specific feedback on what you\'re doing well.',
    color: '#f59e0b'
  },
  support: {
    emoji: '🤝',
    name: 'Support',
    description: 'Actions speak volumes. You value when others help you with your workload, remove blockers, or provide flexibility when you need it.',
    color: '#10b981'
  },
  rewards: {
    emoji: '🎁',
    name: 'Rewards',
    description: 'Tangible appreciation matters, whether that\'s bonuses, gifts, extra time off, or learning opportunities. You like when appreciation comes with something concrete.',
    color: '#ef4444'
  },
  inclusion: {
    emoji: '👥',
    name: 'Inclusion',
    description: 'Being part of the team is important to you. You value being invited to meetings, included in decisions, and participating in team activities.',
    color: '#3b82f6'
  }
}

export default function ResultsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AppreciationProfile | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    // Try Supabase first (permanent storage)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data } = await supabase
        .from('appreciation_profiles')
        .select('quality_time_pct, recognition_pct, support_pct, rewards_pct, inclusion_pct')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setProfile({
          quality_time: data.quality_time_pct,
          recognition: data.recognition_pct,
          support: data.support_pct,
          rewards: data.rewards_pct,
          inclusion: data.inclusion_pct
        })
        return
      }
    }

    // Fall back to localStorage
    const storedProfile = localStorage.getItem('appreciation_profile')
    if (storedProfile) {
      setProfile(JSON.parse(storedProfile))
    } else {
      router.push('/quiz')
    }
  }

  if (!profile) {
    return (
      <div className="container" style={{ minHeight: '100vh', paddingTop: '60px', textAlign: 'center' }}>
        <p>Loading your results...</p>
      </div>
    )
  }

  // Sort languages by percentage (highest first)
  const sortedLanguages = Object.entries(profile)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key as keyof AppreciationProfile)

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '40px', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '12px',
          lineHeight: '1.2'
        }}>
          Your Appreciation Profile
        </h1>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
        }}>
          Here's how you prefer to feel valued at work
        </p>
      </div>

      {/* Profile Results */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '20px'
        }}>
          Your Top Appreciation Languages
        </h2>

        {sortedLanguages.map((language, index) => {
          const info = languageInfo[language]
          const percentage = profile[language]

          return (
            <div key={language} style={{
              marginBottom: index === sortedLanguages.length - 1 ? 0 : '28px',
              paddingBottom: index === sortedLanguages.length - 1 ? 0 : '28px',
              borderBottom: index === sortedLanguages.length - 1 ? 'none' : '1px solid var(--border)'
            }}>
              {/* Name, emoji and percentage row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>{info.emoji}</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {info.name}
                  </div>
                </div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: info.color
                }}>
                  {percentage}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '12px',
                background: '#f3f4f6',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: info.color,
                  borderRadius: '6px',
                  transition: 'width 0.5s ease',
                  animation: 'fillBar 0.8s ease-out'
                }} />
              </div>

              {/* Description below bar */}
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {info.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* Top 3 Highlight */}
      <div className="card" style={{ marginBottom: '24px', background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#15803d' }}>
          💚 Your Top 3
        </h3>
        <p style={{ fontSize: '14px', color: '#166534', marginBottom: '12px' }}>
          These are the ways you most value being appreciated:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedLanguages.slice(0, 3).map(language => {
            const info = languageInfo[language]
            return (
              <div key={language} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#15803d'
              }}>
                <span>{info.emoji}</span>
                <span style={{ fontWeight: '600' }}>{info.name}</span>
                <span style={{ color: '#166534' }}>({profile[language]}%)</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Privacy Notice */}
      <div style={{
        padding: '16px',
        background: '#fef3c7',
        borderRadius: '12px',
        border: '2px solid #fcd34d',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
          <div style={{ fontSize: '20px' }}>🔒</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#78350f', marginBottom: '4px' }}>
              Your results are private
            </div>
            <div style={{ fontSize: '13px', color: '#92400e' }}>
              Only you can see this profile. You can choose to share it with your manager later.
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link href="/dashboard" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
          Continue to Dashboard
        </Link>
        <Link
          href="/quiz"
          className="btn"
          style={{
            width: '100%',
            background: 'white',
            border: '2px solid var(--border)',
            color: 'var(--text-primary)',
            textAlign: 'center'
          }}
        >
          Retake Quiz
        </Link>
      </div>

      <style jsx>{`
        @keyframes fillBar {
          from {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}
