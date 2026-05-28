// File: components/Chatbot.jsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import styles from './Chatbot.module.css'

const STORAGE_KEY = 'chatbot_session_state'
const SESSION_KEY = 'chatbot_session_id'

export default function Chatbot() {
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window === 'undefined') return null
    let sid = sessionStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  })
  const [messages, setMessages] = useState([
    {
      id: 'bot-0',
      text: 'Namaste! 🙏\n\nZindagi mein sabse badi investment ek sahi property hai.\n\nAapka shubh naam kya hai, Sir / Ma\'am?',
      type: 'bot',
      timestamp: new Date(),
    },
  ])

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [userData, setUserData] = useState({})
  const [showOptions, setShowOptions] = useState(true)
  const [error, setError] = useState('')
  const chatEndRef = useRef(null)
  const [isSaved, setIsSaved] = useState(false)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    let sid = sessionStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem(SESSION_KEY, sid)
    }
    setSessionId(sid)

    const savedState = sessionStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed && parsed.sessionId === sid) {
          // Convert serialized timestamps back into Date objects
          const restoredMessages = (parsed.messages || []).map((m) => ({
            ...m,
            timestamp: m && m.timestamp ? new Date(m.timestamp) : new Date(),
          }))

          setMessages(restoredMessages)
          setStep(parsed.step || 0)
          setUserData(parsed.userData || {})
          setIsSaved(parsed.isSaved || false)
          setShowOptions(parsed.showOptions !== false)
        }
      } catch (err) {
        console.warn('Failed to restore chatbot session state:', err)
      }
    }

    const client = getSupabaseClient()
    if (!client) {
      setError('Supabase is not initialized. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (typeof window === 'undefined' || !sessionId) return
    const state = {
      sessionId,
      messages,
      step,
      userData,
      isSaved,
      showOptions,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [sessionId, messages, step, userData, isSaved, showOptions])

  const FLOW = [
    {
      key: 'name',
      isInput: true,
      placeholder: 'Eg: Rajesh Sharma',
      options: null,
      nextMessage: (val) =>
        `Welcome, ${val} Sir! �\n\nJo log sahi time pe invest karte hain woh 3 saal mein double return dekhte hain.\n\nAapka budget range kya hai?`,
    },
    {
      key: 'budget',
      isInput: false,
      options: ['₹40L – ₹70L', '₹70L – ₹1.2Cr', '₹1.2Cr – ₹2Cr', '₹2Cr+'],
      nextMessage: (val) =>
        `${val} range perfect. Is range mein Money Tree ke 3 premium projects hain.\n\nAap kab tak decision lena chahte hain?`,
    },
    {
      key: 'timeline',
      isInput: false,
      options: ['Is mahine', '1–3 mahine', '3–6 mahine', 'Sirf dekh raha hoon'],
      nextMessage: (val) =>
        `${val} — bilkul clear.\n\nProperty kisliye lena chahte hain?`,
    },
    {
      key: 'intent',
      isInput: false,
      options: ['Self-use (rehna hai)', 'Investment (rent/resale)', 'Dono'],
      nextMessage: (val) =>
        `✅ Done, ${userData.name} Sir!\n\nHamara record save ho gaya. Hamare senior advisor aaj shaam tak aapko call karenge.\n\nAapka WhatsApp number?`,
    },
    {
      key: 'phone',
      isInput: true,
      placeholder: '10 digits only',
      options: null,
      nextMessage: (val) =>
        `✅ Perfect! Lead saved.\n\nHamare advisor aaj 6–8 PM ke beech call karega.\n\nThank you for trusting us! 🙏`,
    },
  ]

  const handleInputSend = async () => {
    if (!inputValue.trim() || loading) return

    const userMsg = inputValue.trim()
    setInputValue('')
    setLoading(true)
    setError('')

    const isPhoneStep = FLOW[step].key === 'phone'
    const normalizedPhone = String(userMsg || '')
      .replace(/[\s\-\+]/g, '')
      .replace(/\D/g, '')
      .slice(-10)

    if (isPhoneStep && normalizedPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.')
      setLoading(false)
      return
    }

    const newMsg = {
      id: `user-${Date.now()}`,
      text: userMsg,
      type: 'user',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMsg])

    const newUserData = { ...userData, [FLOW[step].key]: userMsg }
    setUserData(newUserData)

    if (step === FLOW.length - 1) {
      const saved = await saveLead({ ...newUserData, phone: normalizedPhone })
      await new Promise((resolve) => setTimeout(resolve, 600))

      const botMsg = {
        id: `bot-${Date.now()}`,
        text: saved
          ? `✅ Perfect! Lead saved.\n\nHamare advisor aaj 6–8 PM ke beech call karega.\n\nThank you for trusting us! 🙏`
          : 'Sorry, we could not save your lead right now. Please try again in a few moments.',
        type: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
      if (saved) {
        setIsSaved(true)
      }
    } else {
      const nextMsg = FLOW[step].nextMessage(userMsg)
      await new Promise((resolve) => setTimeout(resolve, 600))
      const botMsg = {
        id: `bot-${Date.now()}`,
        text: nextMsg,
        type: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
      setStep((prev) => prev + 1)
    }

    setLoading(false)
  }

  const handleOptionClick = async (option) => {
    if (loading) return
    setShowOptions(false)
    setLoading(true)
    setError('')

    const newMsg = {
      id: `user-${Date.now()}`,
      text: option,
      type: 'user',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMsg])

    const newUserData = { ...userData, [FLOW[step].key]: option }
    setUserData(newUserData)

    if (step === FLOW.length - 1) {
      const saved = await saveLead(newUserData)
      await new Promise((resolve) => setTimeout(resolve, 600))
      const botMsg = {
        id: `bot-${Date.now()}`,
        text: saved
          ? '✅ Perfect! Lead saved.\n\nHamare advisor aaj 6–8 PM ke beech call karega.\n\nThank you for trusting us! 🙏'
          : 'Sorry, we could not save your lead right now. Please try again in a few moments.',
        type: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
      if (saved) {
        setIsSaved(true)
      }
    } else {
      const nextMsg = FLOW[step].nextMessage(option)
      await new Promise((resolve) => setTimeout(resolve, 600))
      const botMsg = {
        id: `bot-${Date.now()}`,
        text: nextMsg,
        type: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
      setStep((prev) => prev + 1)
      setShowOptions(true)
    }

    setLoading(false)
  }

  const saveLead = async (data) => {
    try {
      // Validate and normalize phone
      const normalizedPhone = String(data.phone || '')
        .replace(/[\s\-\+]/g, '')
        .replace(/\D/g, '')
        .slice(-10)

      if (normalizedPhone.length !== 10) {
        console.error('Invalid phone length:', normalizedPhone.length, 'raw input:', data.phone)
        throw new Error('Please enter a valid 10-digit phone number.')
      }

      const leadData = {
        session_id: sessionId,
        name: String(data.name || 'Unknown').trim() || 'Unknown',
        phone: normalizedPhone,
        budget: String(data.budget || 'Unknown').trim() || 'Unknown',
        timeline: String(data.timeline || 'Unknown').trim() || 'Unknown',
        intent: String(data.intent || 'Unknown').trim() || 'Unknown',
        source: 'website_chatbot',
        created_at: new Date().toISOString(),
      }

      // Send to server API route which uses a secure service role key
      console.log('Posting lead to API:', leadData)
      const res = await fetch('/api/save-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      })

      const json = await res.json().catch(() => ({ ok: false }))
      if (!res.ok || !json.ok) {
        const msg = (json && json.error) || `HTTP ${res.status}`
        console.error('API save error:', msg)
        setError(`Unable to save your lead: ${msg}`)
        return false
      }

      console.log('Lead saved successfully via API')
      return true
    } catch (err) {
      console.error('Error saving lead:', err)
      const message = err instanceof Error ? err.message : 'Unable to save your lead right now. Please check your connection and try again.'
      setError(`Please check your phone number and try again. ${message}`)
      return false
    }
  }

  const retrySave = async () => {
    if (loading) return
    setLoading(true)
    setError('')

    const saved = await saveLead({ ...userData, phone: (userData.phone || '').replace(/\D/g, '') })
    await new Promise((resolve) => setTimeout(resolve, 600))

    const botMsg = {
      id: `bot-${Date.now()}`,
      text: saved
        ? `✅ Perfect! Lead saved.\n\nHamare advisor aaj 6–8 PM ke beech call karega.\n\nThank you for trusting us! 🙏`
        : 'Sorry, we could not save your lead right now. Please try again in a few moments.',
      type: 'bot',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, botMsg])
    if (saved) {
      setIsSaved(true)
    }
    setLoading(false)
  }

  const currentFlow = FLOW[step]

  return (
    <div className={styles.container}>
      <div className={styles.chatWindow}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.avatar}>
            <span className={styles.logoMark}>🌳</span>
          </div>
          <div>
            <div className={styles.title}>MONEYTREE REALTY</div>
            <div className={styles.status}>● online</div>
          </div>
        </div>

        {/* Chat body */}
        <div className={styles.chatBody}>
          {messages.map((msg) => {
            const ts = msg && msg.timestamp ? (msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)) : new Date()
            return (
              <div key={msg.id} className={`${styles.message} ${styles[msg.type]}`}>
                <div className={styles.msgContent}>
                  {msg.text.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
                <div className={styles.msgTime}>
                  {ts.getHours()}:{String(ts.getMinutes()).padStart(2, '0')}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {loading && (
            <div className={`${styles.message} ${styles.bot}`}>
              <div className={styles.typing}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className={styles.chatFooter}>
          {!isSaved && (
            <>
              {currentFlow.isInput ? (
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    placeholder={currentFlow.placeholder}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value)
                      if (error) setError('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInputSend()
                    }}
                    className={styles.input}
                    autoFocus
                  />
                  <button
                    onClick={handleInputSend}
                    className={styles.sendBtn}
                    disabled={!inputValue.trim()}
                  >
                    📤
                  </button>
                </div>
              ) : (
                <div className={styles.optionsGroup}>
                  {currentFlow.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleOptionClick(opt)}
                      className={styles.optionBtn}
                      disabled={loading}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {error && step === FLOW.length - 1 && !isSaved && (
            <button className={styles.retryBtn} onClick={retrySave}>
              Retry save
            </button>
          )}

          {isSaved && (
            <div className={styles.successMessage}>
              <div className={styles.checkmark}>✓</div>
              <div>Lead saved successfully!</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                Redirecting to projects page...
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerText}>Powered by Money Tree · by Yash</div>
        </div>
      </div>
    </div>
  )
}