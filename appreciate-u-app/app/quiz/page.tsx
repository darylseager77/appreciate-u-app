'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { quizQuestions, AppreciationLanguage } from '@/lib/quiz-questions'
import { supabase } from '@/lib/supabase'

export default function QuizPage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<{ [key: number]: 'A' | 'B' }>({})
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null)

  const question = quizQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100

  const handleOptionClick = async (option: 'A' | 'B') => {
    // Visual feedback
    setSelectedOption(option)

    // Save response
    const newResponses = {
      ...responses,
      [question.id]: option
    }
    setResponses(newResponses)

    // Wait for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300))

    // Move to next question or finish
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedOption(null)
    } else {
      // Quiz complete - calculate results and redirect
      await saveResults(newResponses)
    }
  }

  const saveResults = async (finalResponses: { [key: number]: 'A' | 'B' }) => {
    // Calculate percentages for each language
    const languageCounts: { [key in AppreciationLanguage]: number } = {
      quality_time: 0,
      recognition: 0,
      support: 0,
      rewards: 0,
      inclusion: 0
    }

    // Count selections for each language
    quizQuestions.forEach(q => {
      const response = finalResponses[q.id]
      if (response === 'A') {
        languageCounts[q.optionA.language]++
      } else if (response === 'B') {
        languageCounts[q.optionB.language]++
      }
    })

    // Calculate percentages
    const total = quizQuestions.length
    const percentages = {
      quality_time: Math.round((languageCounts.quality_time / total) * 100),
      recognition: Math.round((languageCounts.recognition / total) * 100),
      support: Math.round((languageCounts.support / total) * 100),
      rewards: Math.round((languageCounts.rewards / total) * 100),
      inclusion: Math.round((languageCounts.inclusion / total) * 100)
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Save to Supabase using the correct column names
      await supabase
        .from('appreciation_profiles')
        .upsert({
          user_id: user.id,
          quality_time_pct: percentages.quality_time,
          recognition_pct: percentages.recognition,
          support_pct: percentages.support,
          rewards_pct: percentages.rewards,
          inclusion_pct: percentages.inclusion,
          quiz_completed: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      // Also store in localStorage as a backup for immediate display
      localStorage.setItem('appreciation_profile', JSON.stringify(percentages))
    }

    // Redirect to results
    router.push('/results')
  }

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Question {currentQuestion + 1} of {quizQuestions.length}
          </span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '10px',
          background: '#e0e7ff',
          borderRadius: '5px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
            transition: 'width 0.3s ease',
            boxShadow: '0 0 10px rgba(79, 70, 229, 0.3)'
          }} />
        </div>
      </div>

      {/* Instruction Text */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
        padding: '18px 20px',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
        borderRadius: '12px',
        border: '2px solid #c7d2fe',
        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)'
      }}>
        <p style={{
          fontSize: '14px',
          color: '#4338ca',
          lineHeight: '1.6',
          fontWeight: '500'
        }}>
          Choose the scenario that would make you feel most valued. There are no wrong answers - just pick what feels right for you at this time.
        </p>
      </div>

      {/* Question Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '24px',
          color: 'var(--text-primary)',
          lineHeight: '1.4'
        }}>
          {question.scenario}
        </h2>

        {/* Option A */}
        <button
          onClick={() => handleOptionClick('A')}
          className="quiz-option"
          style={{
            width: '100%',
            marginBottom: '12px',
            padding: '20px',
            background: selectedOption === 'A' ? 'var(--primary)' : 'white',
            border: selectedOption === 'A' ? '3px solid var(--primary)' : '3px solid var(--border)',
            color: selectedOption === 'A' ? 'white' : 'var(--text-primary)',
            textAlign: 'left',
            fontSize: '15px',
            lineHeight: '1.5',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          {question.optionA.text}
        </button>

        {/* Option B */}
        <button
          onClick={() => handleOptionClick('B')}
          className="quiz-option"
          style={{
            width: '100%',
            padding: '20px',
            background: selectedOption === 'B' ? 'var(--primary)' : 'white',
            border: selectedOption === 'B' ? '3px solid var(--primary)' : '3px solid var(--border)',
            color: selectedOption === 'B' ? 'white' : 'var(--text-primary)',
            textAlign: 'left',
            fontSize: '15px',
            lineHeight: '1.5',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          {question.optionB.text}
        </button>
      </div>
    </div>
  )
}
