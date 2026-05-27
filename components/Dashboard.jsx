// File: components/Dashboard.jsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, hot: 0, warm: 0 })
  const [selectedLead, setSelectedLead] = useState(null)
  const [error, setError] = useState('')
  const [pageSize] = useState(50)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [last24, setLast24] = useState(true)

  useEffect(() => {
    setPage(0)
    fetchLeads(0, true)
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => fetchLeads(0, true), 10000)
    return () => clearInterval(interval)
  }, [last24])

  const fetchLeads = async (pageToLoad = 0, replace = false) => {
    try {
      setError('')
      const start = pageToLoad * pageSize
      const end = start + pageSize - 1

      let query = supabase
        .from('leads')
        .select('id, session_id, name, phone, budget, timeline, intent, source, created_at')
        .order('created_at', { ascending: false })

      if (last24) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', since)
      }

      const { data, error } = await query.range(start, end)

      if (error) throw error

      const newData = data || []
      setHasMore(newData.length === pageSize)
      setLeads((prev) => {
        const updated = replace ? newData : [...prev, ...newData]
        calculateStats(updated)
        return updated
      })
      setLoading(false)
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError('Unable to load leads right now. Please check your connection or try again later.')
      setLoading(false)
    }
  }

  const calculateStats = (leadsData) => {
    const total = leadsData.length
    const hot = leadsData.filter(
      (l) => l.timeline && (l.timeline.includes('mahine') || l.timeline.includes('Is'))
    ).length
    const warm = total - hot

    setStats({ total, hot, warm })
  }

  const getLeadStatus = (lead) => {
    if (!lead.timeline) return 'Cool'
    if (lead.timeline.includes('Is mahine') || lead.timeline.includes('1–3')) return 'Hot'
    return 'Warm'
  }

  const timeAgo = (timestamp) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diff = Math.floor((now - then) / 1000)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const quoteCsvValue = (value) => {
    const stringValue = value ?? ''
    const escaped = String(stringValue).replace(/"/g, '""')
    return `"${escaped}"`
  }

  const exportCSV = () => {
    ;(async () => {
      try {
        setError('')
        // Fetch all leads (capped)
        let q = supabase.from('leads').select('name, phone, budget, timeline, intent, source, created_at').order('created_at', { ascending: false }).limit(10000)
        if (last24) {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          q = q.gte('created_at', since)
        }
        const { data, error } = await q
        if (error) throw error

        const headers = ['Name', 'Phone', 'Budget', 'Timeline', 'Intent', 'Source', 'Created']
        const rows = (data || []).map((l) => [
          l.name || '',
          l.phone || '',
          l.budget || '-',
          l.timeline || '-',
          l.intent || '-',
          l.source || '',
          new Date(l.created_at).toLocaleString(),
        ])

        const csv = [headers, ...rows].map((row) => row.map(quoteCsvValue).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `money_tree_leads_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Error exporting CSV:', err)
        setError('Unable to export CSV right now. Please try again later.')
      }
    })()
  }

  const formatTelHref = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '')
    if (!digits) return 'tel:'
    return digits.length === 10 ? `tel:+91${digits}` : `tel:${digits}`
  }

  if (loading) {
    return <div className={styles.loading}>Loading leads...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lead Dashboard</h1>
          <div className={styles.liveDot}>
            <span className={styles.pulse}></span>
            Auto-updates every 10 sec
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 12, color: '#ccc' }}>
              <input type="checkbox" checked={last24} onChange={() => setLast24((v) => !v)} style={{ marginRight: 6 }} />
              Show last 24 hours
            </label>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={exportCSV}>
            ⬇ CSV
          </button>
          <button className={styles.btn} onClick={() => { setPage(0); fetchLeads(0, true) }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statVal}>{stats.total}</div>
          <div className={styles.statLbl}>Total leads</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{ color: '#e84040' }}>
            {stats.hot}
          </div>
          <div className={styles.statLbl}>Hot this week</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{ color: '#f59e0b' }}>
            {stats.warm}
          </div>
          <div className={styles.statLbl}>Warm / Cool</div>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <div className={styles.col1}>Name / Phone</div>
          <div className={styles.col2}>Budget</div>
          <div className={styles.col3}>Timeline</div>
          <div className={styles.col4}>Status</div>
          <div className={styles.col5}>When</div>
          <div className={styles.col6}>Action</div>
        </div>

        {leads.length === 0 ? (
          <div className={styles.empty}>No leads yet</div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className={styles.row}
              onClick={() => setSelectedLead(lead)}
            >
              <div className={styles.col1}>
                <div className={styles.name}>{lead.name}</div>
                <div className={styles.phone}>{lead.phone}</div>
              </div>
              <div className={styles.col2}>{lead.budget || '—'}</div>
              <div className={styles.col3}>{lead.timeline || '—'}</div>
              <div className={styles.col4}>
                <span className={`${styles.badge} ${styles[getLeadStatus(lead).toLowerCase()]}`}>
                  {getLeadStatus(lead)}
                </span>
              </div>
              <div className={styles.col5}>{timeAgo(lead.created_at)}</div>
              <div className={styles.col6}>
                <a
                  href={formatTelHref(lead.phone)}
                  className={styles.callBtn}
                  onClick={(e) => e.stopPropagation()}
                  title={`Call ${lead.name}`}
                >
                  📞
                </a>
              </div>
            </div>
          ))
        )}
        {hasMore && (
          <div style={{ textAlign: 'center', padding: 12 }}>
            <button
              className={styles.btn}
              onClick={() => {
                const next = page + 1
                setPage(next)
                fetchLeads(next, false)
              }}
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedLead && (
        <div className={styles.modal} onClick={() => setSelectedLead(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>{selectedLead.name}</div>
            <div className={styles.modalField}>
              <div className={styles.modalLabel}>Phone</div>
              <div className={styles.modalValue}>{selectedLead.phone}</div>
            </div>
            <div className={styles.modalField}>
              <div className={styles.modalLabel}>Budget</div>
              <div className={styles.modalValue}>{selectedLead.budget || '—'}</div>
            </div>
            <div className={styles.modalField}>
              <div className={styles.modalLabel}>Timeline</div>
              <div className={styles.modalValue}>{selectedLead.timeline || '—'}</div>
            </div>
            <div className={styles.modalField}>
              <div className={styles.modalLabel}>Intent</div>
              <div className={styles.modalValue}>{selectedLead.intent || '—'}</div>
            </div>
            <div className={styles.modalActions}>
              <a
                href={formatTelHref(selectedLead.phone)}
                className={styles.callBtnLarge}
              >
                📞 Call now
              </a>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedLead(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}