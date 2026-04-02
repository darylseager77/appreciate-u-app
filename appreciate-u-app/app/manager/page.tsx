'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
  shared_with_manager: boolean
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

interface Recognition {
  id: string
  from_user_id: string
  to_user_id: string
  message: string
  created_at: string
}

const moodEmojis: { [key: number]: { emoji: string; label: string; color: string } } = {
  1: { emoji: '😔', label: 'Struggling', color: '#ef4444' },
  2: { emoji: '😕', label: 'Not great', color: '#f97316' },
  3: { emoji: '😐', label: 'Okay', color: '#eab308' },
  4: { emoji: '🙂', label: 'Good', color: '#84cc16' },
  5: { emoji: '😄', label: 'Great!', color: '#10b981' },
}

const languageInfo: { [key: string]: { emoji: string; name: string; color: string; description: string } } = {
  quality_time_pct: {
    emoji: '⏰', name: 'Quality Time', color: '#8b5cf6',
    description: 'One-on-ones, focused conversations, and being genuinely present with them.'
  },
  recognition_pct: {
    emoji: '🌟', name: 'Recognition', color: '#f59e0b',
    description: 'Verbal praise, shout-outs, and acknowledgement for their contributions.'
  },
  support_pct: {
    emoji: '🤝', name: 'Support', color: '#10b981',
    description: 'Help removing blockers, checking in on workload, and having their back.'
  },
  rewards_pct: {
    emoji: '🎁', name: 'Rewards', color: '#ef4444',
    description: 'Bonuses, perks, and tangible appreciation for good work.'
  },
  inclusion_pct: {
    emoji: '👥', name: 'Inclusion', color: '#3b82f6',
    description: 'Being included in decisions, consulted on plans, and valued as a voice.'
  },
}


const needsLabels: { [key: string]: string } = {
  checkin: '🗣️ A proper check-in conversation',
  recognition: '🌟 Recognition for recent work',
  help: '📋 Help prioritising my workload',
  blocker: '🚧 Help removing a blocker',
  flexibility: '🕐 Some flexibility this week',
}

const relativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = diff / (1000 * 60 * 60)
  if (hours < 24) return 'today'
  if (hours < 48) return 'yesterday'
  if (hours < 168) return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long' })
  return `${Math.floor(hours / 24)} days ago`
}

function ManagerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as 'overview' | 'myteam') || 'overview'
  const [activeTab, setActiveTab] = useState<'overview' | 'myteam'>(initialTab)

  const switchTab = (tab: 'overview' | 'myteam') => {
    setActiveTab(tab)
    router.replace(`/manager?tab=${tab}`, { scroll: false })
  }
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [appreciationProfiles, setAppreciationProfiles] = useState<AppreciationProfile[]>([])
  const [recognitions, setRecognitions] = useState<Recognition[]>([])

  // Dashboard tab state
  const [expandedNeeds, setExpandedNeeds] = useState<Set<string>>(new Set())
  const [actionedNeeds, setActionedNeeds] = useState<Set<string>>(new Set())
  const [swipeState, setSwipeState] = useState<{ id: string; startX: number; x: number } | null>(null)
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  // Attention card state
  const [expandedAttention, setExpandedAttention] = useState<string | null>(null)
  const [acknowledgeTarget, setAcknowledgeTarget] = useState<string | null>(null)
  const [acknowledgeText, setAcknowledgeText] = useState('')
  const [actionedAttention, setActionedAttention] = useState<Set<string>>(new Set())

  // People tab state
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)
  const [recognitionTarget, setRecognitionTarget] = useState<string | null>(null)
  const [recognitionText, setRecognitionText] = useState('')
  const [recognitionSent, setRecognitionSent] = useState<string | null>(null)


  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUser(user)

    const { data: profilesData } = await supabase
      .from('profiles').select('id, full_name, email, role')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: checkInsData } = await supabase
      .from('check_ins').select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    const { data: apData } = await supabase
      .from('appreciation_profiles')
      .select('user_id, quality_time_pct, recognition_pct, support_pct, rewards_pct, inclusion_pct, quiz_completed')
      .eq('quiz_completed', true)

    const { data: recognitionsData } = await supabase
      .from('recognitions')
      .select('id, from_user_id, to_user_id, message, created_at')
      .order('created_at', { ascending: false })

    setProfiles(profilesData || [])
    setCheckIns(checkInsData || [])
    setAppreciationProfiles(apData || [])
    setRecognitions(recognitionsData || [])
    setLoading(false)
  }

  const isWeekday = (dateStr: string) => ![0, 6].includes(new Date(dateStr).getDay())

  const latestMoods = checkIns
    .filter(c => c.mood_score !== null && c.shared_with_manager === true && isWeekday(c.created_at))
    .reduce((acc, c) => {
      if (!acc[c.user_id]) acc[c.user_id] = c
      return acc
    }, {} as { [key: string]: CheckIn })

  const allLatestMoods = checkIns
    .filter(c => c.mood_score !== null && isWeekday(c.created_at))
    .reduce((acc, c) => {
      if (!acc[c.user_id]) acc[c.user_id] = c
      return acc
    }, {} as { [key: string]: CheckIn })

  // Only the most recent needs submission per person (checkIns already ordered by created_at desc)
  const needsSubmissions = Object.values(
    checkIns
      .filter(c => c.need_expressed !== null && c.shared_with_manager === true)
      .reduce((acc, c) => {
        if (!acc[c.user_id]) acc[c.user_id] = c
        return acc
      }, {} as { [key: string]: CheckIn })
  )

  const getTopLanguages = (ap: AppreciationProfile) =>
    Object.entries(languageInfo)
      .map(([key, info]) => ({ ...info, percentage: ap[key as keyof AppreciationProfile] as number }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 2)

  const getAllLanguages = (ap: AppreciationProfile) =>
    Object.entries(languageInfo)
      .map(([key, info]) => ({ ...info, percentage: ap[key as keyof AppreciationProfile] as number }))
      .sort((a, b) => b.percentage - a.percentage)

  const avgMood = Object.values(allLatestMoods).length > 0
    ? (Object.values(allLatestMoods).reduce((sum, c) => sum + (c.mood_score || 0), 0) / Object.values(allLatestMoods).length).toFixed(1)
    : null

  const handleSendRecognition = async (toUserId: string) => {
    if (!recognitionText.trim() || !currentUser) return
    const { error } = await supabase.from('recognitions').insert({
      from_user_id: currentUser.id,
      to_user_id: toUserId,
      message: recognitionText.trim()
    })
    if (!error) {
      setRecognitionSent(toUserId)
      setRecognitionText('')
      setRecognitionTarget(null)
      setActionedAttention(prev => new Set(Array.from(prev).concat(toUserId)))
      await loadData()
    }
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

  // Employees only (exclude managers from People list)
  const teamMembers = profiles.filter(p => p.role !== 'manager')

  const tabTitle = activeTab === 'overview' ? 'Overview' : 'My Team'

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'white', borderBottom: '1px solid #e5e7eb',
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0
        }}>
          <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
            {tabTitle}
          </h1>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
            Log out
          </button>
        </div>

        <div style={{ flex: 1, padding: '20px', paddingBottom: '88px' }}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (() => {
            const needsByPerson = needsSubmissions.reduce((acc, s) => {
              if (!acc[s.user_id]) acc[s.user_id] = []
              acc[s.user_id].push(s)
              return acc
            }, {} as { [key: string]: CheckIn[] })

            const openNeedsCount = teamMembers.filter(m =>
              (needsByPerson[m.id] || []).some(s => !actionedNeeds.has(s.id))
            ).length

            // Sort: open needs first, then by most recent check-in, then no activity
            const sortedMembers = [...teamMembers].sort((a, b) => {
              const aHasNeeds = (needsByPerson[a.id] || []).some(s => !actionedNeeds.has(s.id))
              const bHasNeeds = (needsByPerson[b.id] || []).some(s => !actionedNeeds.has(s.id))
              if (aHasNeeds !== bHasNeeds) return aHasNeeds ? -1 : 1
              const aMood = latestMoods[a.id]
              const bMood = latestMoods[b.id]
              if (aMood && bMood) return new Date(bMood.created_at).getTime() - new Date(aMood.created_at).getTime()
              if (aMood) return -1
              if (bMood) return 1
              return 0
            })

            const avgMoodNum = avgMood ? parseFloat(avgMood) : null
            const avgMoodEmoji = avgMoodNum === null ? '—'
              : avgMoodNum >= 4.5 ? '😄'
              : avgMoodNum >= 3.5 ? '🙂'
              : avgMoodNum >= 2.5 ? '😐'
              : avgMoodNum >= 1.5 ? '😕'
              : '😔'

            // This week summary
            const todayDate = new Date()
            const todayDay = todayDate.getDay()
            const weekMonday = new Date(todayDate)
            weekMonday.setDate(todayDate.getDate() - (todayDay === 0 ? 6 : todayDay - 1))
            weekMonday.setHours(0, 0, 0, 0)
            const weekFriday = new Date(weekMonday)
            weekFriday.setDate(weekMonday.getDate() + 4)
            const lastWeekMonday = new Date(weekMonday)
            lastWeekMonday.setDate(weekMonday.getDate() - 7)

            const thisWeekCheckIns = checkIns.filter(c => c.mood_score !== null && new Date(c.created_at) >= weekMonday)
            const lastWeekCheckIns = checkIns.filter(c => c.mood_score !== null && new Date(c.created_at) >= lastWeekMonday && new Date(c.created_at) < weekMonday)
            const thisWeekAvgMood = thisWeekCheckIns.length > 0
              ? thisWeekCheckIns.reduce((sum, c) => sum + (c.mood_score || 0), 0) / thisWeekCheckIns.length
              : null
            const lastWeekAvgMood = lastWeekCheckIns.length > 0
              ? lastWeekCheckIns.reduce((sum, c) => sum + (c.mood_score || 0), 0) / lastWeekCheckIns.length
              : null
            const moodTrend = thisWeekAvgMood !== null && lastWeekAvgMood !== null
              ? thisWeekAvgMood > lastWeekAvgMood + 0.2 ? 'up'
              : thisWeekAvgMood < lastWeekAvgMood - 0.2 ? 'down'
              : 'flat'
              : null

            // Check-in rate this week (unique team members who checked in)
            const weekCheckInPeople = new Set(
              checkIns
                .filter(c => c.mood_score !== null && new Date(c.created_at) >= weekMonday && c.user_id !== currentUser?.id)
                .map(c => c.user_id)
            ).size
            const checkInRate = teamMembers.length > 0
              ? `${weekCheckInPeople}/${teamMembers.length}`
              : '—'

            // Recognition sent this month by current manager
            const monthStart = new Date()
            monthStart.setDate(1)
            monthStart.setHours(0, 0, 0, 0)
            const recognitionThisMonth = recognitions.filter(
              r => r.from_user_id === currentUser?.id && new Date(r.created_at) >= monthStart
            ).length

            // Overall mood label
            const overallMoodLabel = avgMoodNum === null ? '—'
              : avgMoodNum >= 4.5 ? 'Great'
              : avgMoodNum >= 3.5 ? 'Good'
              : avgMoodNum >= 2.5 ? 'Okay'
              : avgMoodNum >= 1.5 ? 'Low'
              : 'Struggling'

            // Needs Your Attention items
            const now = Date.now()
            const attentionItems: { type: 'need' | 'no-checkin' | 'no-recognition'; member: typeof teamMembers[0]; daysAgo: number; need?: string; topLang?: string; topLangPct?: number }[] = []

            teamMembers.forEach(member => {
              if (actionedAttention.has(member.id)) return

              // Unactioned needs
              const memberNeeds = needsSubmissions.filter(s => s.user_id === member.id && !actionedNeeds.has(s.id))
              memberNeeds.forEach(s => {
                const daysAgo = Math.floor((now - new Date(s.created_at).getTime()) / 86400000)
                if (daysAgo >= 3) {
                  const ap = appreciationProfiles.find(a => a.user_id === member.id)
                  const topLang = ap ? Object.entries(languageInfo)
                    .map(([key, info]) => ({ ...info, pct: ap[key as keyof AppreciationProfile] as number }))
                    .sort((a, b) => b.pct - a.pct)[0] : null
                  let needs: string[] = []
                  try { needs = JSON.parse(s.need_expressed || '[]') } catch { needs = [] }
                  attentionItems.push({ type: 'need', member, daysAgo, need: needs[0], topLang: topLang?.name, topLangPct: topLang?.pct })
                }
              })

              // No check-in in 5+ days
              const lastCheckIn = checkIns.find(c => c.user_id === member.id && c.mood_score !== null)
              const daysSinceCheckIn = lastCheckIn
                ? Math.floor((now - new Date(lastCheckIn.created_at).getTime()) / 86400000)
                : 999
              if (daysSinceCheckIn >= 5) {
                attentionItems.push({ type: 'no-checkin', member, daysAgo: daysSinceCheckIn })
              }

              // No recognition in 14+ days (if Recognition is their top language)
              const lastRec = recognitions.find(r => r.to_user_id === member.id && r.from_user_id === currentUser?.id)
              const daysSinceRec = lastRec
                ? Math.floor((now - new Date(lastRec.created_at).getTime()) / 86400000)
                : 999
              const ap = appreciationProfiles.find(a => a.user_id === member.id)
              const topLang = ap ? Object.entries(languageInfo)
                .map(([key, info]) => ({ ...info, pct: ap[key as keyof AppreciationProfile] as number }))
                .sort((a, b) => b.pct - a.pct)[0] : null
              if (daysSinceRec >= 14 && topLang?.name === 'Recognition') {
                attentionItems.push({ type: 'no-recognition', member, daysAgo: daysSinceRec, topLang: topLang?.name, topLangPct: topLang?.pct })
              }
            })

            // Group by member — worst item wins for colour
            const attentionByMember = attentionItems.reduce((acc, item) => {
              if (!acc[item.member.id]) acc[item.member.id] = []
              acc[item.member.id].push(item)
              return acc
            }, {} as { [key: string]: typeof attentionItems })

            // Suggested action per attention item
            const suggestedAction = (item: typeof attentionItems[0]) => {
              const name = item.member.full_name?.split(' ')[0] || 'them'
              const langStr = item.topLang && item.topLangPct ? `${name} values ${item.topLang} (${item.topLangPct}%). ` : ''
              if (item.type === 'need') {
                const actions: { [key: string]: string } = {
                  'Quality Time': `Schedule a 1-on-1 to discuss their concerns and be fully present.`,
                  'Recognition': `Send a personal note acknowledging their recent effort.`,
                  'Support': `Check in on their workload — consider redistributing tasks or removing blockers.`,
                  'Rewards': `Consider a tangible thank-you for their recent effort.`,
                  'Inclusion': `Invite them into an upcoming decision or planning conversation.`,
                }
                const action = item.topLang ? (actions[item.topLang] || `Follow up on their expressed need.`) : `Follow up on their expressed need.`
                return `${langStr}${action}`
              }
              if (item.type === 'no-checkin') return `${name} hasn't checked in for ${item.daysAgo} days — consider reaching out directly.`
              if (item.type === 'no-recognition') return `${langStr}It's been ${item.daysAgo} days since you last recognised them.`
              return ''
            }

            return (
              <>
                {/* Stats Row — 3 cards */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'stretch' }}>
                  {/* Overall Mood */}
                  <div style={{
                    flex: 1, padding: '14px 8px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                    border: '2px solid #c4b5fd', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {moodTrend && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
                        <span style={{ fontSize: '11px', color: moodTrend === 'up' ? '#10b981' : moodTrend === 'down' ? '#ef4444' : '#f59e0b' }}>
                          {moodTrend === 'up' ? '↑' : moodTrend === 'down' ? '↓' : '→'}
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>{avgMoodEmoji}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed', lineHeight: 1.2 }}>{overallMoodLabel}</div>
                    <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '500', marginTop: '3px' }}>Overall Mood</div>
                  </div>

                  {/* Check-in Rate */}
                  <div style={{
                    flex: 1, padding: '14px 8px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    border: '2px solid #86efac', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a', lineHeight: 1, marginBottom: '10px' }}>{checkInRate}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', lineHeight: 1.2 }}>Check-ins</div>
                    <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: '500', marginTop: '3px' }}>this week</div>
                  </div>

                  {/* Recognition Sent */}
                  <div style={{
                    flex: 1, padding: '14px 8px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
                    border: '2px solid #fde047', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#ca8a04', lineHeight: 1, marginBottom: '10px' }}>{recognitionThisMonth}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#a16207', lineHeight: 1.2 }}>Recognition</div>
                    <div style={{ fontSize: '10px', color: '#ca8a04', fontWeight: '500', marginTop: '3px' }}>this month</div>
                  </div>
                </div>

                {/* Needs Your Attention */}
                {Object.keys(attentionByMember).length > 0 && (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid #fecaca' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', color: '#dc2626' }}>⚠️ Needs Your Attention</h2>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>Tap a person to see detail and take action</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(attentionByMember).map(([memberId, items]) => {
                        const worstDays = Math.max(...items.map(i => i.daysAgo))
                        const isRed = worstDays >= 5
                        const dotColor = isRed ? '#ef4444' : '#f59e0b'
                        const isExpanded = expandedAttention === memberId
                        const member = items[0].member
                        const name = member.full_name?.split(' ')[0] || member.full_name
                        const summary = items[0].type === 'need' && items[0].need
                          ? needsLabels[items[0].need]?.replace(/^[^ ]+ /, '') || items[0].need
                          : items[0].type === 'no-checkin' ? `No check-in for ${items[0].daysAgo} days`
                          : `No recognition in ${items[0].daysAgo} days`
                        const isAcknowledging = acknowledgeTarget === memberId

                        return (
                          <div key={memberId} style={{ borderRadius: '10px', border: `1px solid ${isRed ? '#fca5a5' : '#fde68a'}`, overflow: 'hidden' }}>
                            {/* Collapsed row */}
                            <button
                              onClick={() => setExpandedAttention(isExpanded ? null : memberId)}
                              style={{
                                width: '100%', padding: '12px 14px', background: isRed ? '#fff1f2' : '#fffbeb',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left'
                              }}
                            >
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{name}</span>
                                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>{summary}</span>
                              </div>
                              <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                            </button>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <div style={{ padding: '14px', background: 'white', borderTop: `1px solid ${isRed ? '#fecaca' : '#fde68a'}` }}>
                                {items.map((item, i) => (
                                  <div key={i} style={{ marginBottom: i < items.length - 1 ? '12px' : '0' }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                      {item.type === 'need' && item.need && (
                                        <span>Expressed: <strong style={{ color: '#111827' }}>{needsLabels[item.need] || item.need}</strong>
                                          <span style={{ color: '#9ca3af' }}> · {item.daysAgo >= 5 ? `${item.daysAgo}d — urgent` : `${item.daysAgo}d ago`}</span>
                                        </span>
                                      )}
                                      {item.type === 'no-checkin' && <span>No check-in for <strong style={{ color: '#111827' }}>{item.daysAgo} days</strong></span>}
                                      {item.type === 'no-recognition' && <span>No recognition sent in <strong style={{ color: '#111827' }}>{item.daysAgo} days</strong></span>}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#4f46e5', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '12px' }}>
                                      💡 {suggestedAction(item)}
                                    </div>
                                  </div>
                                ))}

                                {/* Action buttons */}
                                {isAcknowledging ? (
                                  <div>
                                    <textarea
                                      autoFocus
                                      value={acknowledgeText}
                                      onChange={e => setAcknowledgeText(e.target.value)}
                                      placeholder={`Add a note for ${name}...`}
                                      rows={2}
                                      style={{
                                        width: '100%', padding: '10px', fontSize: '13px',
                                        border: '2px solid #4f46e5', borderRadius: '8px',
                                        outline: 'none', resize: 'none', fontFamily: 'inherit',
                                        color: '#111827', background: '#f9fafb',
                                        boxSizing: 'border-box', marginBottom: '8px'
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        onClick={() => { setAcknowledgeTarget(null); setAcknowledgeText('') }}
                                        style={{ flex: 1, padding: '8px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}
                                      >Cancel</button>
                                      <button
                                        onClick={() => {
                                          setActionedAttention(prev => new Set(Array.from(prev).concat(memberId)))
                                          setAcknowledgeTarget(null)
                                          setAcknowledgeText('')
                                          setExpandedAttention(null)
                                        }}
                                        style={{ flex: 2, padding: '8px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                      >✓ Send & Mark Done</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <button
                                      onClick={() => setAcknowledgeTarget(memberId)}
                                      style={{ width: '100%', padding: '9px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                    >💬 Acknowledge & add a note</button>
                                    <button
                                      onClick={() => {
                                        setActionedAttention(prev => new Set(Array.from(prev).concat(memberId)))
                                        setExpandedAttention(null)
                                      }}
                                      style={{ width: '100%', padding: '9px', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                    >📅 Book time / 1-on-1</button>
                                    <button
                                      onClick={() => {
                                        setExpandedAttention(null)
                                        setExpandedPerson(memberId)
                                        setRecognitionTarget(memberId)
                                        setRecognitionSent(null)
                                        switchTab('myteam')
                                      }}
                                      style={{ width: '100%', padding: '9px', background: '#fefce8', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                    >🌟 Send Recognition</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Your Team — unified per-person cards */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Your Team</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Tap to expand needs · swipe left to mark done</p>

                  {sortedMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                      <p style={{ fontSize: '14px', margin: 0 }}>No team members yet</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sortedMembers.map(member => {
                        const mood = latestMoods[member.id] ? moodEmojis[latestMoods[member.id].mood_score!] : null
                        const personSubmissions = needsByPerson[member.id] || []
                        const activeSubmissions = personSubmissions.filter(s => !actionedNeeds.has(s.id))
                        const hasOpenNeeds = activeSubmissions.length > 0
                        const totalNeeds = activeSubmissions.reduce((sum, s) => {
                          try { return sum + JSON.parse(s.need_expressed || '[]').length } catch { return sum }
                        }, 0)
                        const isExpanded = expandedNeeds.has(member.id)
                        const swipeX = swipeState?.id === member.id ? Math.min(0, swipeState.x) : 0
                        const borderColor = hasOpenNeeds ? '#fcd34d' : mood ? mood.color + '40' : '#e5e7eb'
                        const bgColor = hasOpenNeeds ? '#fffbeb' : mood ? mood.color + '08' : 'white'

                        return (
                          <div key={member.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
                            {/* Swipe background — only shown when person has open needs */}
                            {hasOpenNeeds && (
                              <div style={{
                                position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px',
                                background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '12px', flexDirection: 'column', gap: '2px'
                              }}>
                                <span style={{ fontSize: '20px' }}>✓</span>
                                <span style={{ fontSize: '10px', color: 'white', fontWeight: '700' }}>Done</span>
                              </div>
                            )}

                            <div
                              style={{
                                padding: '14px', background: bgColor,
                                border: `2px solid ${borderColor}`, borderRadius: '12px',
                                transform: `translateX(${swipeX}px)`,
                                transition: swipeState?.id === member.id ? 'none' : 'transform 0.3s ease',
                                cursor: hasOpenNeeds ? 'pointer' : 'default',
                                userSelect: 'none', touchAction: 'pan-y'
                              }}
                              onClick={() => {
                                if (!hasOpenNeeds || Math.abs(swipeX) >= 10) return
                                setExpandedNeeds(prev => {
                                  const next = new Set(prev)
                                  next.has(member.id) ? next.delete(member.id) : next.add(member.id)
                                  return next
                                })
                              }}
                              onTouchStart={(e) => { if (hasOpenNeeds) setSwipeState({ id: member.id, startX: e.touches[0].clientX, x: 0 }) }}
                              onTouchMove={(e) => {
                                if (!hasOpenNeeds) return
                                const delta = e.touches[0].clientX - (swipeState?.startX ?? e.touches[0].clientX)
                                setSwipeState(prev => prev ? { ...prev, x: Math.min(0, delta) } : null)
                              }}
                              onTouchEnd={() => {
                                if (swipeX < -80) {
                                  setActionedNeeds(prev => new Set(Array.from(prev).concat(personSubmissions.map(s => s.id))))
                                }
                                setSwipeState(null)
                              }}
                            >
                              {/* Collapsed row */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '28px', flexShrink: 0 }}>
                                  {mood ? mood.emoji : '👤'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                                    {member.full_name || member.email}
                                  </div>
                                  <div style={{ fontSize: '12px', marginTop: '2px', color: mood ? mood.color : '#9ca3af', fontWeight: '500' }}>
                                    {mood
                                      ? <>{mood.label} · <span style={{ color: '#9ca3af', fontWeight: '400' }}>{relativeTime(latestMoods[member.id].created_at)}</span></>
                                      : 'No check-in yet'
                                    }
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  {hasOpenNeeds && (
                                    <span style={{
                                      fontSize: '11px', background: '#fef3c7', color: '#a16207',
                                      padding: '2px 7px', borderRadius: '20px', fontWeight: '600'
                                    }}>
                                      {totalNeeds} need{totalNeeds !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {mood && (
                                    <div style={{
                                      width: '30px', height: '30px', borderRadius: '50%',
                                      background: mood.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '13px', fontWeight: '800', color: 'white'
                                    }}>
                                      {latestMoods[member.id].mood_score}
                                    </div>
                                  )}
                                  {hasOpenNeeds && (
                                    <span style={{ fontSize: '12px', color: '#a16207' }}>{isExpanded ? '▲' : '▼'}</span>
                                  )}
                                </div>
                              </div>

                              {/* Expanded needs */}
                              {isExpanded && hasOpenNeeds && (
                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {activeSubmissions.map(submission => {
                                    let needs: string[] = []
                                    try { needs = JSON.parse(submission.need_expressed || '[]') } catch { needs = [] }
                                    return (
                                      <div key={submission.id} style={{
                                        padding: '10px 12px', background: 'white', borderRadius: '10px',
                                        border: '1px solid #fde68a'
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '11px', color: '#a16207', fontWeight: '600' }}>
                                            {relativeTime(submission.created_at)}
                                          </span>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setActionedNeeds(prev => new Set(Array.from(prev).concat(submission.id))) }}
                                            style={{
                                              padding: '3px 10px', fontSize: '11px', fontWeight: '600',
                                              background: '#f0fdf4', color: '#15803d',
                                              border: '1px solid #86efac', borderRadius: '20px', cursor: 'pointer'
                                            }}
                                          >
                                            ✓ Done
                                          </button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {needs.map(need => (
                                            <span key={need} style={{
                                              padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                              background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d'
                                            }}>
                                              {needsLabels[need] || need}
                                            </span>
                                          ))}
                                        </div>
                                        {submission.notes && (
                                          <div style={{
                                            marginTop: '6px', padding: '8px 10px', background: '#fefce8', borderRadius: '6px',
                                            fontSize: '13px', color: '#6b7280', fontStyle: 'italic', borderLeft: '3px solid #fcd34d'
                                          }}>
                                            "{submission.notes}"
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                  {activeSubmissions.length > 1 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setActionedNeeds(prev => new Set(Array.from(prev).concat(personSubmissions.map(s => s.id)))) }}
                                      style={{
                                        width: '100%', padding: '10px', background: '#10b981', color: 'white',
                                        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                      }}
                                    >
                                      ✓ Mark all done
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )
          })()}

          {/* ── MY TEAM TAB ── */}
          {activeTab === 'myteam' && (
            <>
              {/* Team Member List */}
              {teamMembers.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                  <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>No team members yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {teamMembers.map(member => {
                    const ap = appreciationProfiles.find(a => a.user_id === member.id)
                    const topLangs = ap ? getTopLanguages(ap) : []
                    const allLangs = ap ? getAllLanguages(ap) : []
                    const topColor = topLangs[0]?.color || '#6366f1'
                    const isExpanded = expandedPerson === member.id
                    const latestMood = latestMoods[member.id]
                    const memberRecognitions = recognitions.filter(r => r.to_user_id === member.id)
                    const isRecognising = recognitionTarget === member.id
                    const justSent = recognitionSent === member.id

                    return (
                      <div key={member.id} style={{
                        background: 'white', borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden'
                      }}>
                        {/* Card header — always visible */}
                        <button
                          onClick={() => setExpandedPerson(isExpanded ? null : member.id)}
                          style={{
                            width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                            display: 'flex', alignItems: 'center', gap: '12px',
                            cursor: 'pointer', textAlign: 'left'
                          }}
                        >
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                            background: ap ? topColor + '20' : '#f3f4f6',
                            border: `2px solid ${ap ? topColor + '50' : '#e5e7eb'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px'
                          }}>
                            {topLangs[0]?.emoji || '👤'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                              {member.full_name || member.email}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {ap ? topLangs.map((lang, i) => (
                                <span key={lang.name} style={{
                                  fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600',
                                  background: lang.color + '15', color: lang.color, border: `1px solid ${lang.color}30`
                                }}>
                                  {i === 0 ? '★ ' : ''}{lang.name}
                                </span>
                              )) : (
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Quiz not taken</span>
                              )}
                              {latestMood && (
                                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                  {moodEmojis[latestMood.mood_score!]?.emoji} {relativeTime(latestMood.created_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: '14px', color: '#9ca3af', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (() => {
                          const memberNeeds = needsSubmissions.filter(s => s.user_id === member.id)
                          const activeNeeds = memberNeeds.filter(s => !actionedNeeds.has(s.id))
                          return (
                          <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>

                            {/* Current mood */}
                            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Current Mood</div>
                              {latestMood ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: moodEmojis[latestMood.mood_score!]?.color + '10', borderRadius: '10px', border: `1px solid ${moodEmojis[latestMood.mood_score!]?.color}30` }}>
                                  <span style={{ fontSize: '28px' }}>{moodEmojis[latestMood.mood_score!]?.emoji}</span>
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: moodEmojis[latestMood.mood_score!]?.color }}>{moodEmojis[latestMood.mood_score!]?.label}</div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '1px' }}>{relativeTime(latestMood.created_at)}</div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: '10px', fontSize: '13px', color: '#9ca3af' }}>No check-in yet</div>
                              )}
                            </div>

                            {/* Open needs */}
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                What They Need {activeNeeds.length > 0 && <span style={{ background: '#fef3c7', color: '#a16207', padding: '1px 6px', borderRadius: '20px', fontSize: '10px', marginLeft: '4px' }}>{activeNeeds.reduce((sum, s) => { try { return sum + JSON.parse(s.need_expressed || '[]').length } catch { return sum } }, 0)}</span>}
                              </div>
                              {activeNeeds.length === 0 ? (
                                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px', fontSize: '13px', color: '#15803d' }}>✓ No open needs</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {activeNeeds.map(submission => {
                                    let needs: string[] = []
                                    try { needs = JSON.parse(submission.need_expressed || '[]') } catch { needs = [] }
                                    return (
                                      <div key={submission.id} style={{ padding: '10px 12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fcd34d' }}>
                                        <div style={{ fontSize: '11px', color: '#a16207', marginBottom: '8px', fontWeight: '600' }}>{relativeTime(submission.created_at)}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {needs.map(need => (
                                            <div key={need} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: '13px', color: '#92400e' }}>{needsLabels[need] || need}</span>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); setActionedNeeds(prev => new Set(Array.from(prev).concat(submission.id))) }}
                                                style={{ padding: '3px 10px', fontSize: '11px', fontWeight: '600', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: '20px', cursor: 'pointer' }}
                                              >✓ Done</button>
                                            </div>
                                          ))}
                                        </div>
                                        {submission.notes && (
                                          <div style={{ marginTop: '8px', padding: '6px 10px', background: '#fefce8', borderRadius: '6px', fontSize: '12px', color: '#6b7280', fontStyle: 'italic', borderLeft: '3px solid #fcd34d' }}>
                                            "{submission.notes}"
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Appreciation languages */}
                            {ap && (
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Appreciation Languages</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                  {allLangs.map((lang, index) => {
                                    const size = index === 0 ? 52 : index === 1 ? 44 : 36
                                    return (
                                      <div key={lang.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                        <div style={{
                                          width: `${size}px`, height: `${size}px`, borderRadius: '50%',
                                          background: lang.color,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: index === 0 ? '22px' : index === 1 ? '18px' : '14px',
                                          boxShadow: index === 0 ? `0 4px 10px ${lang.color}60` : 'none',
                                          border: index === 0 ? `3px solid ${lang.color}` : 'none',
                                          outline: index === 0 ? `2px solid white` : 'none',
                                          outlineOffset: '-4px',
                                        }}>
                                          {lang.emoji}
                                        </div>
                                        <span style={{ fontSize: '9px', fontWeight: index === 0 ? '700' : '500', color: index === 0 ? lang.color : '#6b7280', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                          {lang.name}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Recent recognitions sent */}
                            {memberRecognitions.length > 0 && (
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                  Recent Recognitions
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {memberRecognitions.slice(0, 3).map(rec => (
                                    <div key={rec.id} style={{ padding: '8px 12px', background: '#fefce8', borderRadius: '8px', borderLeft: '3px solid #fcd34d' }}>
                                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{relativeTime(rec.created_at)}</div>
                                      <div style={{ fontSize: '13px', color: '#111827' }}>"{rec.message}"</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Send recognition */}
                            {justSent ? (
                              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '10px', textAlign: 'center', border: '1px solid #86efac' }}>
                                <div style={{ fontSize: '20px', marginBottom: '4px' }}>🌟</div>
                                <div style={{ fontSize: '13px', color: '#15803d', fontWeight: '600' }}>Recognition sent!</div>
                              </div>
                            ) : isRecognising ? (
                              <div>
                                <textarea
                                  autoFocus
                                  value={recognitionText}
                                  onChange={(e) => setRecognitionText(e.target.value)}
                                  placeholder={`What would you like to recognise ${member.full_name?.split(' ')[0] || 'them'} for?`}
                                  rows={3}
                                  style={{
                                    width: '100%', padding: '12px', fontSize: '14px',
                                    border: '2px solid #4f46e5', borderRadius: '10px',
                                    outline: 'none', resize: 'none', fontFamily: 'inherit',
                                    color: '#111827', background: '#f9fafb',
                                    boxSizing: 'border-box', marginBottom: '8px'
                                  }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => { setRecognitionTarget(null); setRecognitionText('') }}
                                    style={{
                                      flex: 1, padding: '10px', background: 'none',
                                      border: '2px solid #e5e7eb', borderRadius: '10px',
                                      fontSize: '13px', color: '#6b7280', cursor: 'pointer', fontWeight: '600'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSendRecognition(member.id)}
                                    disabled={!recognitionText.trim()}
                                    style={{
                                      flex: 2, padding: '10px',
                                      background: recognitionText.trim() ? '#4f46e5' : '#e5e7eb',
                                      color: recognitionText.trim() ? 'white' : '#9ca3af',
                                      border: 'none', borderRadius: '10px',
                                      fontSize: '13px', fontWeight: '600', cursor: recognitionText.trim() ? 'pointer' : 'not-allowed'
                                    }}
                                  >
                                    Send Recognition 🌟
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setRecognitionTarget(member.id); setRecognitionSent(null) }}
                                style={{
                                  width: '100%', padding: '12px',
                                  background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
                                  border: '2px solid #fcd34d', borderRadius: '10px',
                                  fontSize: '14px', fontWeight: '600', color: '#92400e', cursor: 'pointer'
                                }}
                              >
                                🌟 Send Recognition
                              </button>
                            )}
                          </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Language Glossary */}
              <div style={{ background: 'white', borderRadius: '16px', marginTop: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <button
                  onClick={() => setGlossaryOpen(o => !o)}
                  style={{
                    width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>What do the languages mean?</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Tap to {glossaryOpen ? 'hide' : 'see'} descriptions</div>
                  </div>
                  <span style={{ fontSize: '14px', color: '#9ca3af' }}>{glossaryOpen ? '▲' : '▼'}</span>
                </button>
                {glossaryOpen && (
                  <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.values(languageInfo).map(lang => (
                      <div key={lang.name} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                          background: lang.color + '15', border: `1px solid ${lang.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                        }}>
                          {lang.emoji}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: lang.color }}>{lang.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', lineHeight: '1.5' }}>{lang.description}</div>
                        </div>
                      </div>
                    ))}
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
            onClick={() => switchTab('overview')}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '10px 8px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'overview' ? '#4f46e5' : '#9ca3af',
              borderTop: activeTab === 'overview' ? '3px solid #4f46e5' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'overview' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'overview' ? '700' : '500' }}>Overview</span>
          </button>

          <button
            onClick={() => switchTab('myteam')}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '10px 8px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'myteam' ? '#4f46e5' : '#9ca3af',
              borderTop: activeTab === 'myteam' ? '3px solid #4f46e5' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'myteam' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'myteam' ? '700' : '500' }}>My Team</span>
          </button>

        </nav>
      </div>
    </div>
  )
}

export default function ManagerPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#6b7280' }}>Loading...</p></div>}>
      <ManagerPage />
    </Suspense>
  )
}
