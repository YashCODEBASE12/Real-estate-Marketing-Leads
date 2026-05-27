// File: app/page.js (or pages/index.js for pages router)
'use client'

import Chatbot from '@/components/Chatbot'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Chatbot />
    </div>
  )
}