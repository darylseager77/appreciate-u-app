'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AppreciationProfile {
  quality_time_pct: number
  recognition_pct: number
  support_pct: number
  rewards_pct: number
  inclusion_pct: number
  quiz_completed: boolean
}

const languageInfo: { [key: string]: { emoji: string; name: string; color: string } } = {
  quality_time_pct: { emoji: '⏰', name: 'Quality Time', color: '#8b5cf6' },
  recognition_pct: { emoji: '🌟', name: 'Recognition', color: '#f59e0b' },
  support_pct: { emoji: '🤝', name: 'Support', color: '#10b981' },
  rewards_pct: { emoji: '🎁', name: 'Rewards', color: '#ef4444' },
  inclusion_pct: { emoji: '👥', name: 'Inclusion', color: '#3b82f6' }
}

const checkInOptions = [
  { emoji: '😢', label: 'Struggling', value: 1, color: '#dc2626' },
  { emoji: '😕', label: 'Not great', value: 2, color: '#ef4444' },
  { emoji: '😐', label: 'Okay', value: 3, color: '#f59e0b' },
  { emoji: '🙂', label: 'Good', value: 4, color: '#22c55e' },
  { emoji: '😄', label: 'Great!', value: 5, color: '#15803d' }
]

const needsOptions = [
  { id: 'checkin', emoji: '🗣️', label: 'A proper check-in conversation' },
  { id: 'recognition', emoji: '🌟', label: 'Recognition for recent work' },
  { id: 'help', emoji: '📋', label: 'Help prioritising my workload' },
  { id: 'blocker', emoji: '🚧', label: 'Help removing a blocker' },
  { id: 'flexibility', emoji: '🕐', label: 'Some flexibility this week' },
  { id: 'growth', emoji: '📈', label: 'A conversation about my growth' },
  { id: 'included', emoji: '🤝', label: 'To be included in an upcoming decision' }
]

export default function TeamMemberPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<AppreciationProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkInSelected, setCheckInSelected] = useState<number | null>(null)
  const [checkInSaved, setCheckInSaved] = useState(false)
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([])
  const [needsNote, setNeedsNote] = useState('')
  const [needsSaved, setNeedsSaved] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const { data } = await supabase
      .from('appreciation_profiles')
      .select('quality_time_pct, recognition_pct, support_pct, rewards_pct, inclusion_pct, quiz_completed')
      .eq('user_id', user.id)
      .single()

    if (data) setProfile(data)
    setLoading(false)
  }

  const handleCheckIn = async (value: number) => {
    setCheckInSelected(value)
    await supabase.from('check_ins').insert({
      user_id: user.id,
      mood_score: value
    })
    setCheckInSaved(true)
  }

  const handleNeedToggle = (id: string) => {
    setSelectedNeeds(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    )
    setNeedsSaved(false)
  }

  const handleSaveNeeds = async () => {
    await supabase.from('check_ins').insert({
      user_id: user.id,
      need_expressed: JSON.stringify(selectedNeeds),
      notes: needsNote || null,
      shared_with_manager: true
    })
    setNeedsSaved(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Get top 3 languages sorted by percentage
  const getTopLanguages = () => {
    if (!profile) return []
    return Object.entries(languageInfo)
      .map(([key, info]) => ({
        ...info,
        percentage: profile[key as keyof AppreciationProfile] as number
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3)
  }

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '100vh', paddingTop: '60px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    )
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const topLanguages = getTopLanguages()
  const quizDone = profile?.quiz_completed

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '32px', paddingBottom: '60px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              Hi, {firstName} 👋
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              How are you feeling at work today?
            </p>
          </div>
          <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '48px', height: '48px' }}
          >
            <circle cx="50" cy="50" r="48" fill="#4f46e5" opacity="0.1"/>
            <path d="M 30 45 Q 30 35, 35 35 Q 40 35, 40 45 Q 40 55, 35 55 Q 30 55, 30 45 Z" fill="#4f46e5"/>
            <path d="M 60 45 Q 60 35, 65 35 Q 70 35, 70 45 Q 70 55, 65 55 Q 60 55, 60 45 Z" fill="#4f46e5"/>
            <path d="M 25 60 Q 50 75, 75 60" stroke="#4f46e5" strokeWidth="4" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Daily Check-in */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '4px' }}>
          Daily Check-in
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          How are you feeling at work right now?
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          {checkInOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleCheckIn(option.value)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 4px',
                background: option.color,
                border: checkInSelected === option.value ? '3px solid #111827' : '2px solid transparent',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: checkInSelected !== null && checkInSelected !== option.value ? 0.5 : 1
              }}
            >
              <span style={{ fontSize: '28px' }}>{option.emoji}</span>
              <span style={{ fontSize: '11px', color: 'white', fontWeight: '600' }}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {checkInSaved && (
          <p style={{ fontSize: '13px', color: '#10b981', marginTop: '12px', textAlign: 'center', fontWeight: '500' }}>
            ✓ Check-in saved!
          </p>
        )}
      </div>

      {/* Top Appreciation Languages */}
      {quizDone && topLanguages.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '700' }}>
              Your Top Appreciation Languages
            </h2>
            <Link href="/results" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topLanguages.map((lang, index) => (
              <div key={lang.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: index === 0 ? '#f5f3ff' : '#f9fafb',
                borderRadius: '10px',
                border: index === 0 ? '2px solid #e0e7ff' : '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '28px' }}>{lang.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {index === 0 && <span style={{ fontSize: '11px', color: lang.color, fontWeight: '700', marginRight: '6px' }}>TOP</span>}
                    {lang.name}
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    marginTop: '6px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${lang.percentage}%`,
                      height: '100%',
                      background: lang.color,
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: lang.color }}>
                  {lang.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What I Need Right Now */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '4px' }}>
          What I Need Right Now
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Let your manager know what would help you most this week.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {needsOptions.map(option => {
            const isSelected = selectedNeeds.includes(option.id)
            return (
              <button
                key={option.id}
                onClick={() => handleNeedToggle(option.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: isSelected ? '#f0fdf4' : 'white',
                  border: isSelected ? '2px solid #10b981' : '2px solid var(--border)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
              >
                <span style={{
                  fontSize: '20px',
                  width: '28px',
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  {option.emoji}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: '14px',
                  color: isSelected ? '#15803d' : 'var(--text-primary)',
                  fontWeight: isSelected ? '600' : '400'
                }}>
                  {option.label}
                </span>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: isSelected ? '#10b981' : 'white',
                  border: isSelected ? '2px solid #10b981' : '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}>
                  {isSelected && (
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '700', lineHeight: 1 }}>✓</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Free text field */}
        <textarea
          value={needsNote}
          onChange={(e) => { setNeedsNote(e.target.value); setNeedsSaved(false) }}
          placeholder="Anything else you'd like to share with your manager..."
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            border: '2px solid var(--border)',
            borderRadius: '10px',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            color: 'var(--text-primary)',
            marginBottom: '12px'
          }}
        />

        <button
          onClick={handleSaveNeeds}
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={selectedNeeds.length === 0 && !needsNote}
        >
          {needsSaved ? '✓ Saved!' : 'Share with Manager'}
        </button>

        {needsSaved && (
          <p style={{ fontSize: '13px', color: '#10b981', marginTop: '8px', textAlign: 'center' }}>
            Your manager will see this in their dashboard.
          </p>
        )}
      </div>

      {/* Quiz Prompt (if not completed) */}
      {!quizDone && (
        <div className="card" style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
          border: '2px solid #c7d2fe'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
            Discover Your Appreciation Profile
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
            Take the 25-question quiz to find out how you prefer to feel valued at work. It takes about 3 minutes.
          </p>
          <Link href="/quiz" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
            Take the Quiz →
          </Link>
        </div>
      )}

      {/* Footer Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link href="/results" className="btn" style={{
          width: '100%',
          textAlign: 'center',
          background: 'white',
          border: '2px solid var(--border)',
          color: 'var(--text-primary)'
        }}>
          View My Full Profile
        </Link>
        {quizDone && (
          <Link href="/quiz" style={{
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            padding: '8px'
          }}>
            Retake Quiz
          </Link>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          Log out
        </button>
      </div>
    </div>
  )
}
