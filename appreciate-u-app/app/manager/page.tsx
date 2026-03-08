'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
}

interface CheckIn {
  id: string
  user_id: string
  mood_score: number | null
  need_expressed: string | null
  notes: string | null
  created_at: string
}

interface AppreciationProfile {
  user_id: string
  quality_time_pct: number
  recognition_pct: number
  support_pct: number
  rewards_pct: number
  inclusion_pct: number
  quiz_completed: boolean
}

const moodEmojis: { [key: number]: { emoji: string; label: string; color: string } } = {
  1: { emoji: '😔', label: 'Struggling', color: '#ef4444' },
  2: { emoji: '😕', label: 'Not great', color: '#f97316' },
  3: { emoji: '😐', label: 'Okay', color: '#eab308' },
  4: { emoji: '🙂', label: 'Good', color: '#84cc16' },
  5: { emoji: '😄', label: 'Great!', color: '#10b981' },
}

const languageInfo: { [key: string]: { emoji: string; name: string; color: string } } = {
  quality_time_pct: { emoji: '⏰', name: 'Quality Time', color: '#8b5cf6' },
  recognition_pct: { emoji: '🌟', name: 'Recognition', color: '#f59e0b' },
  support_pct: { emoji: '🤝', name: 'Support', color: '#10b981' },
  rewards_pct: { emoji: '🎁', name: 'Rewards', color: '#ef4444' },
  inclusion_pct: { emoji: '👥', name: 'Inclusion', color: '#3b82f6' },
}

const needsLabels: { [key: string]: string } = {
  checkin: '🗣️ Proper check-in',
  recognition: '🌟 Recognition',
  help: '📋 Help with workload',
  blocker: '🚧 Remove a blocker',
  flexibility: '🕐 Some flexibility',
  growth: '📈 Growth conversation',
  included: '🤝 Included in decisions',
}

export default function ManagerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [appreciationProfiles, setAppreciationProfiles] = useState<AppreciationProfile[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Load all profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')

    // Load today's check-ins
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: checkInsData } = await supabase
      .from('check_ins')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    // Load all appreciation profiles
    const { data: apData } = await supabase
      .from('appreciation_profiles')
      .select('user_id, quality_time_pct, recognition_pct, support_pct, rewards_pct, inclusion_pct, quiz_completed')
      .eq('quiz_completed', true)

    setProfiles(profilesData || [])
    setCheckIns(checkInsData || [])
    setAppreciationProfiles(apData || [])
    setLoading(false)
  }

  const getProfile = (userId: string) =>
    profiles.find(p => p.id === userId)

  // Get the latest mood check-in per user today
  const latestMoods = checkIns
    .filter(c => c.mood_score !== null)
    .reduce((acc, c) => {
      if (!acc[c.user_id]) acc[c.user_id] = c
      return acc
    }, {} as { [key: string]: CheckIn })

  // Get needs submissions from today
  const needsSubmissions = checkIns.filter(c => c.need_expressed !== null)

  // Get top 2 languages for a user
  const getTopLanguages = (ap: AppreciationProfile) => {
    return Object.entries(languageInfo)
      .map(([key, info]) => ({
        ...info,
        percentage: ap[key as keyof AppreciationProfile] as number
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 2)
  }

  const avgMood = Object.values(latestMoods).length > 0
    ? (Object.values(latestMoods).reduce((sum, c) => sum + (c.mood_score || 0), 0) / Object.values(latestMoods).length).toFixed(1)
    : null

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '100vh', paddingTop: '60px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '32px', paddingBottom: '60px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              Manager View 💼
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              How your team is doing today
            </p>
          </div>
          <Link href="/dashboard" style={{
            fontSize: '13px',
            color: 'var(--primary)',
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            My Dashboard →
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <div style={{
          flex: 1, padding: '16px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '2px solid #86efac', textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>
            {Object.keys(latestMoods).length}
          </div>
          <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '600', marginTop: '2px' }}>
            Check-ins today
          </div>
        </div>
        <div style={{
          flex: 1, padding: '16px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
          border: '2px solid #fde047', textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#ca8a04' }}>
            {needsSubmissions.length}
          </div>
          <div style={{ fontSize: '11px', color: '#a16207', fontWeight: '600', marginTop: '2px' }}>
            Needs flagged
          </div>
        </div>
        <div style={{
          flex: 1, padding: '16px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
          border: '2px solid #c4b5fd', textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>
            {avgMood || '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: '600', marginTop: '2px' }}>
            Avg mood /5
          </div>
        </div>
      </div>

      {/* Team Pulse */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px' }}>
          🌡️ Team Pulse Today
        </h2>

        {Object.keys(latestMoods).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No check-ins yet today</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.values(latestMoods).map(checkIn => {
              const profile = getProfile(checkIn.user_id)
              const mood = moodEmojis[checkIn.mood_score!]
              return (
                <div key={checkIn.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: mood.color + '10',
                  borderRadius: '12px',
                  border: `2px solid ${mood.color}30`
                }}>
                  <span style={{ fontSize: '32px' }}>{mood.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {profile?.full_name || profile?.email || 'Team member'}
                    </div>
                    <div style={{ fontSize: '12px', color: mood.color, fontWeight: '600', marginTop: '2px' }}>
                      {mood.label}
                    </div>
                  </div>
                  <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    background: mood.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: '800', color: 'white'
                  }}>
                    {checkIn.mood_score}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* What the Team Needs */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px' }}>
          🙋 What the Team Needs
        </h2>

        {needsSubmissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No needs shared yet today</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {needsSubmissions.map(submission => {
              const profile = getProfile(submission.user_id)
              let needs: string[] = []
              try {
                needs = JSON.parse(submission.need_expressed || '[]')
              } catch {
                needs = []
              }
              return (
                <div key={submission.id} style={{
                  padding: '14px',
                  background: 'linear-gradient(135deg, #fefce8, #fffbeb)',
                  border: '2px solid #fcd34d',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: '#f59e0b', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', flexShrink: 0
                    }}>
                      👤
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#78350f' }}>
                      {profile?.full_name || profile?.email || 'Team member'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {needs.map(need => (
                      <span key={need} style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: 'white',
                        color: '#92400e',
                        border: '1px solid #fcd34d'
                      }}>
                        {needsLabels[need] || need}
                      </span>
                    ))}
                  </div>
                  {submission.notes && (
                    <div style={{
                      marginTop: '10px', padding: '8px 12px',
                      background: 'white', borderRadius: '8px',
                      fontSize: '13px', color: 'var(--text-secondary)',
                      fontStyle: 'italic', borderLeft: '3px solid #fcd34d'
                    }}>
                      "{submission.notes}"
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Team Appreciation Profiles */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '700' }}>💜 Team Profiles</h2>
          <span style={{
            padding: '3px 10px', borderRadius: '20px',
            fontSize: '12px', fontWeight: '600',
            background: '#f5f3ff', color: '#7c3aed',
            border: '1px solid #ddd6fe'
          }}>
            {appreciationProfiles.length} completed
          </span>
        </div>

        {appreciationProfiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              No team members have completed the quiz yet
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {appreciationProfiles.map(ap => {
              const profile = getProfile(ap.user_id)
              const topLangs = getTopLanguages(ap)
              const topColor = topLangs[0]?.color || '#6366f1'
              return (
                <div key={ap.user_id} style={{
                  padding: '14px',
                  background: topColor + '08',
                  borderRadius: '12px',
                  border: `2px solid ${topColor}25`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: topColor + '25',
                      border: `2px solid ${topColor}50`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', flexShrink: 0
                    }}>
                      {topLangs[0]?.emoji || '👤'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {profile?.full_name || profile?.email || 'Team member'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {topLangs.map((lang, i) => (
                      <span key={lang.name} style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: lang.color + '15',
                        color: lang.color,
                        border: `1px solid ${lang.color}40`
                      }}>
                        {i === 0 ? '★ ' : ''}{lang.emoji} {lang.name} {lang.percentage}%
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
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
