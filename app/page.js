// File: app/page.js (or pages/index.js for pages router)
'use client'

import Chatbot from '@/components/Chatbot'

export default function Home() {
  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <Chatbot />
    </div>
  )
}