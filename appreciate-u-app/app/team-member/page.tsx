'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

interface AppreciationProfile {
  quality_time_pct: number
  recognition_pct: number
  support_pct: number
  rewards_pct: number
  inclusion_pct: number
  quiz_completed: boolean
}

interface CheckIn {
  mood_score?: number | null
  need_expressed?: string | null
  notes?: string | null
  created_at: string
}

const languageInfo: { [key: string]: { emoji: string; name: string; short: string; color: string } } = {
  quality_time_pct: { emoji: '⏰', name: 'Quality Time', short: 'Q. Time', color: '#8b5cf6' },
  recognition_pct: { emoji: '🌟', name: 'Recognition', short: 'Recognit.', color: '#f59e0b' },
  support_pct: { emoji: '🤝', name: 'Support', short: 'Support', color: '#10b981' },
  rewards_pct: { emoji: '🎁', name: 'Rewards', short: 'Rewards', color: '#ef4444' },
  inclusion_pct: { emoji: '👥', name: 'Inclusion', short: 'Inclusion', color: '#3b82f6' }
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
]

const needsLabels: { [key: string]: string } = {
  checkin: 'A proper check-in',
  recognition: 'Recognition',
  help: 'Help with workload',
  blocker: 'Remove a blocker',
  flexibility: 'Some flexibility',
}


function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'profile' ? 'profile' : 'checkin'

  const [activeTab, setActiveTab] = useState<'checkin' | 'profile'>(initialTab)

  const switchTab = (tab: 'checkin' | 'profile') => {
    setActiveTab(tab)
    router.replace(`/team-member?tab=${tab}`, { scroll: false })
  }
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<AppreciationProfile | null>(null)
  const [weekCheckIns, setWeekCheckIns] = useState<CheckIn[]>([])
  const [, setRecentNeeds] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [checkInSelected, setCheckInSelected] = useState<number | null>(null)
  const [checkInSaved, setCheckInSaved] = useState(false)
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([])
  const [needsNote, setNeedsNote] = useState('')
  const [needsSaved, setNeedsSaved] = useState(false)
  const [checkInComplete, setCheckInComplete] = useState(false)
  const [shareWithManager, setShareWithManager] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const { data: appreciationData } = await supabase
      .from('appreciation_profiles')
      .select('quality_time_pct, recognition_pct, support_pct, rewards_pct, inclusion_pct, quiz_completed')
      .eq('user_id', user.id).single()
    if (appreciationData) setProfile(appreciationData)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { data: weekData } = await supabase
      .from('check_ins')
      .select('mood_score, need_expressed, notes, created_at')
      .eq('user_id', user.id)
      .gte('created_at', weekAgo.toISOString())
      .not('mood_score', 'is', null)
      .order('created_at', { ascending: false })
    if (weekData) setWeekCheckIns(weekData)

    const { data: needsData } = await supabase
      .from('check_ins')
      .select('need_expressed, notes, created_at')
      .eq('user_id', user.id)
      .not('need_expressed', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3)
    if (needsData) setRecentNeeds(needsData)

    setLoading(false)
  }

  const handleCheckIn = async (value: number) => {
    setCheckInSelected(value)
    await supabase.from('check_ins').insert({ user_id: user.id, mood_score: value, shared_with_manager: shareWithManager })
    setCheckInSaved(true)
    await loadDashboard()
  }

  const handleNeedToggle = (id: string) => {
    setSelectedNeeds(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id])
    setNeedsSaved(false)
  }

  const handleSaveNeeds = async () => {
    if (shareWithManager && checkInSelected) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      await supabase.from('check_ins')
        .update({ shared_with_manager: true })
        .eq('user_id', user.id)
        .not('mood_score', 'is', null)
        .gte('created_at', todayStart.toISOString())
    }
    await supabase.from('check_ins').insert({
      user_id: user.id,
      need_expressed: JSON.stringify(selectedNeeds),
      notes: needsNote || null,
      shared_with_manager: shareWithManager
    })
    setNeedsSaved(true)
    setCheckInComplete(true)
  }

  const handleResetCheckIn = () => {
    setCheckInSelected(null)
    setCheckInSaved(false)
    setSelectedNeeds([])
    setNeedsNote('')
    setNeedsSaved(false)
    setCheckInComplete(false)
    setShareWithManager(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    )
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const quizDone = profile?.quiz_completed

  const moodCheckIns = weekCheckIns.filter(c => c.mood_score !== null)
  const sortedLanguages = profile
    ? Object.entries(languageInfo)
        .map(([key, info]) => ({
          ...info,
          percentage: profile[key as keyof AppreciationProfile] as number
        }))
        .sort((a, b) => b.percentage - a.percentage)
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
          {activeTab === 'profile' ? 'My Profile' : `Hi, ${firstName} 👋`}
        </h1>
        <button onClick={handleLogout} style={{
          background: 'none', border: 'none', color: '#9ca3af', fontSize: '13px', cursor: 'pointer'
        }}>
          Log out
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, padding: '20px', paddingBottom: '88px' }}>

        {/* ── CHECK-IN TAB ── */}
        {activeTab === 'checkin' && (
          <>
          {[0, 6].includes(new Date().getDay()) ? (
            <div style={{ background: 'white', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🌿</div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>It&apos;s the weekend!</h2>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                Check-ins are for work days only.<br />Please go and relax — we&apos;ll see you Monday.
              </p>
            </div>
          ) : checkInComplete ? (
            <div style={{ background: 'white', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>
                {checkInOptions.find(o => o.value === checkInSelected)?.emoji || '✅'}
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                You&apos;re all set!
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>
                {checkInSaved && checkInSelected && (
                  <>Feeling <strong>{checkInOptions.find(o => o.value === checkInSelected)?.label}</strong> today.</>
                )}
                {needsSaved && selectedNeeds.length > 0 && (
                  <><br />{shareWithManager ? 'Your manager can see what you need.' : 'Logged privately — not shared with your manager.'}</>
                )}
              </p>
              {needsSaved && selectedNeeds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '24px' }}>
                  {selectedNeeds.map(n => (
                    <span key={n} style={{ fontSize: '12px', background: '#eef2ff', color: '#4f46e5', padding: '4px 12px', borderRadius: '20px', fontWeight: '500' }}>
                      {needsLabels[n] || n}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={handleResetCheckIn}
                style={{ background: 'none', border: '2px solid #e5e7eb', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', color: '#6b7280', cursor: 'pointer', fontWeight: '500' }}
              >
                Update check-in
              </button>
            </div>
          ) : (
          <>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>How are you today?</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                {checkInOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleCheckIn(option.value)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '12px 4px',
                      background: checkInSelected === option.value ? option.color + '30' : option.color + '18',
                      border: checkInSelected === option.value ? `2px solid ${option.color}` : `2px solid ${option.color}60`,
                      borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{option.emoji}</span>
                    <span style={{ fontSize: '11px', color: option.color, fontWeight: '600' }}>{option.label}</span>
                  </button>
                ))}
              </div>
              {checkInSaved && (
                <p style={{ fontSize: '13px', color: '#10b981', marginTop: '12px', textAlign: 'center', fontWeight: '600' }}>
                  ✓ Check-in saved!
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '12px 14px', background: shareWithManager ? '#f0fdf4' : '#f9fafb', borderRadius: '10px', border: `1px solid ${shareWithManager ? '#86efac' : '#e5e7eb'}` }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Share with manager</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>Your mood will be visible to them</div>
                </div>
                <button
                  onClick={() => setShareWithManager(v => !v)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', flexShrink: 0,
                    background: shareWithManager ? '#10b981' : '#d1d5db', position: 'relative', transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                    position: 'absolute', top: '3px', transition: 'left 0.2s',
                    left: shareWithManager ? '23px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>What I Need Right Now</h2>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Select anything that would help you this week.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {needsOptions.map(option => {
                  const isSelected = selectedNeeds.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleNeedToggle(option.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px',
                        background: isSelected ? '#f0fdf4' : '#f9fafb',
                        border: isSelected ? '2px solid #10b981' : '2px solid #e5e7eb',
                        borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s', width: '100%'
                      }}
                    >
                      <span style={{ fontSize: '20px', width: '28px', textAlign: 'center', flexShrink: 0 }}>{option.emoji}</span>
                      <span style={{ flex: 1, fontSize: '14px', color: isSelected ? '#15803d' : '#111827', fontWeight: isSelected ? '600' : '400' }}>
                        {option.label}
                      </span>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: isSelected ? '#10b981' : 'white',
                        border: isSelected ? '2px solid #10b981' : '2px solid #d1d5db',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s'
                      }}>
                        {isSelected && <span style={{ color: 'white', fontSize: '12px', fontWeight: '700', lineHeight: '1' }}>✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
              <textarea
                value={needsNote}
                onChange={(e) => { setNeedsNote(e.target.value); setNeedsSaved(false) }}
                placeholder="Anything else you'd like to share with your manager..."
                rows={3}
                style={{
                  width: '100%', padding: '12px', fontSize: '14px',
                  border: '2px solid #e5e7eb', borderRadius: '10px',
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                  color: '#111827', marginBottom: '12px', background: '#f9fafb',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={handleSaveNeeds}
                disabled={selectedNeeds.length === 0 && !needsNote}
                style={{
                  width: '100%', padding: '14px',
                  background: (selectedNeeds.length === 0 && !needsNote) ? '#e5e7eb' : '#4f46e5',
                  color: (selectedNeeds.length === 0 && !needsNote) ? '#9ca3af' : 'white',
                  border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600',
                  cursor: (selectedNeeds.length === 0 && !needsNote) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {needsSaved ? '✓ Saved!' : 'Share with Manager'}
              </button>
              {needsSaved && (
                <p style={{ fontSize: '13px', color: '#10b981', marginTop: '8px', textAlign: 'center' }}>
                  {shareWithManager ? 'Your manager can see what you need.' : 'Logged privately — not shared with your manager.'}
                </p>
              )}
            </div>
          </>
          )}
          </>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <>
            {!quizDone && (
              <div style={{
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                borderRadius: '16px', padding: '24px', marginBottom: '16px',
                border: '2px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                <div style={{ fontSize: '36px', flexShrink: 0 }}>✨</div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#3730a3', margin: '0 0 4px' }}>
                    Discover Your Appreciation Profile
                  </h2>
                  <p style={{ fontSize: '13px', color: '#4f46e5', margin: '0 0 12px', lineHeight: '1.5' }}>
                    Takes about 3 minutes.
                  </p>
                  <Link href="/quiz" style={{
                    display: 'inline-block', padding: '8px 16px', background: '#4f46e5', color: 'white',
                    borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none'
                  }}>
                    Take the Quiz →
                  </Link>
                </div>
              </div>
            )}

            {(() => {
              const today = new Date()
              const dayOfWeek = today.getDay()
              const monday = new Date(today)
              monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
              monday.setHours(0, 0, 0, 0)
              const weekdays = Array.from({ length: 5 }, (_, i) => {
                const d = new Date(monday)
                d.setDate(monday.getDate() + i)
                const dayLabel = ['M','T','W','T','F'][i]
                const dateNum = d.getDate()
                const checkIn = moodCheckIns.find(c => {
                  const cd = new Date(c.created_at)
                  cd.setHours(0, 0, 0, 0)
                  return cd.getTime() === d.getTime()
                })
                return { dayLabel, dateNum, checkIn }
              })
              const moodColors: { [k: number]: { emoji: string; color: string } } = {
                1: { emoji: '😢', color: '#dc2626' },
                2: { emoji: '😕', color: '#ef4444' },
                3: { emoji: '😐', color: '#f59e0b' },
                4: { emoji: '🙂', color: '#22c55e' },
                5: { emoji: '😄', color: '#15803d' },
              }
              return (
                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>This Week</h2>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>Your daily mood check-ins</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {weekdays.map(({ dayLabel, dateNum, checkIn }, i) => {
                      const mood = checkIn?.mood_score ? moodColors[checkIn.mood_score] : null
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: mood ? mood.color + '20' : '#f3f4f6',
                            border: `2px solid ${mood ? mood.color + '60' : '#e5e7eb'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: mood ? '20px' : '14px', color: mood ? 'inherit' : '#d1d5db'
                          }}>
                            {mood ? mood.emoji : '·'}
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: mood ? '#374151' : '#9ca3af' }}>
                            {dayLabel}
                          </span>
                          <span style={{ fontSize: '10px', color: '#d1d5db' }}>
                            {dateNum}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Appreciation Profile</h2>
                {quizDone && <Link href="/quiz" style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'none' }}>Retake Quiz</Link>}
              </div>
              {quizDone ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                  {sortedLanguages.map((lang, index) => {
                    const size = index === 0 ? 56 : index === 1 ? 48 : 40
                    return (
                      <div key={lang.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: `${size}px`, height: `${size}px`, borderRadius: '50%',
                          background: lang.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: index === 0 ? '24px' : index === 1 ? '20px' : '16px',
                          boxShadow: index === 0 ? `0 4px 12px ${lang.color}60` : 'none',
                        }}>
                          {lang.emoji}
                        </div>
                        <span style={{
                          fontSize: '9px', fontWeight: index === 0 ? '700' : '500',
                          color: index === 0 ? lang.color : '#6b7280',
                          textAlign: 'center', whiteSpace: 'nowrap', lineHeight: '1.2'
                        }}>
                          {lang.name}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: index === 0 ? lang.color : '#9ca3af' }}>
                          {lang.percentage}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af' }}>
                  <p style={{ fontSize: '14px', margin: 0 }}>Complete the quiz above to see your profile</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'sticky', bottom: 0,
        background: 'white', borderTop: '1px solid #e5e7eb',
        zIndex: 100, boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
        display: 'flex', flexShrink: 0
      }}>
        <button
          onClick={() => switchTab('checkin')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            padding: '10px 8px', background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === 'checkin' ? '#4f46e5' : '#9ca3af',
            borderTop: activeTab === 'checkin' ? '3px solid #4f46e5' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'checkin' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'checkin' ? '700' : '500' }}>Check-in</span>
        </button>

        <button
          onClick={() => switchTab('profile')}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            padding: '10px 8px', background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === 'profile' ? '#4f46e5' : '#9ca3af',
            borderTop: activeTab === 'profile' ? '3px solid #4f46e5' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'profile' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'profile' ? '700' : '500' }}>My Profile</span>
        </button>
      </nav>

      </div>
    </div>
  )
}

export default function TeamMemberPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
