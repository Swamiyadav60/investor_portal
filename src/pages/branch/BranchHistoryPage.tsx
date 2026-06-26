import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/format'

export function BranchHistoryPage() {
  const { investor } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['branch-expenses-history', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*, kiosk:kiosks(name)')
        .eq('created_by', investor!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })

  const filteredExpenses = expenses.filter((exp: any) => {
    if (statusFilter === 'all') return true
    return exp.status === statusFilter
  })

  return (
    <>
      <Topbar title="Expense History" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <h2 className="section-heading">Logged Operational Costs</h2>
            <p className="section-heading-sub">View, track, and audit historical submissions logged by you</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`admin-btn ${statusFilter === status ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              style={{
                textTransform: 'capitalize',
                padding: '8px 16px',
                fontSize: '13px',
                borderRadius: '8px',
                height: 'auto',
                border: statusFilter === status ? 'none' : '1px solid var(--border)',
                background: statusFilter === status ? 'var(--green-d)' : 'var(--white)',
                color: statusFilter === status ? 'var(--white)' : 'var(--gray-d)',
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: statusFilter === status ? '0 4px 12px rgba(26, 155, 108, 0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {status === 'all' ? 'All Logs' : `${status} Only`}
            </button>
          ))}
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Submission Date</th>
                  <th>Kiosk / Printer</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                  <th>{statusFilter === 'rejected' ? 'Rejection Reason' : 'Admin Remarks'}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray)' }}>
                      Loading historical logs...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray)' }}>
                      No {statusFilter !== 'all' ? statusFilter : ''} expenses logged yet.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp: any) => (
                    <tr key={exp.id}>
                      <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {new Date(exp.period_start).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>{exp.kiosk?.name || 'Smart Printer'}</td>
                      <td>
                        <span style={{
                          background: 'var(--gray-l)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: 'var(--gray)'
                        }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize', color: 'var(--gray)' }}>
                        {exp.expense_type}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmt(exp.amount)}</td>
                      <td>
                        <span className={`status-badge ${exp.status}`} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}>
                          {exp.status}
                        </span>
                      </td>
                      <td>
                        {exp.bill_url ? (
                          <a 
                            href={exp.bill_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              color: 'var(--green-d)', 
                              fontWeight: 600, 
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            View Bill ↗
                          </a>
                        ) : (
                          <span style={{ color: 'var(--gray)', fontStyle: 'italic', fontSize: '13px' }}>No Receipt</span>
                        )}
                      </td>
                      <td style={{ 
                        color: (exp.rejection_reason || exp.admin_remarks) ? 'var(--ink)' : 'var(--gray)', 
                        fontStyle: (exp.rejection_reason || exp.admin_remarks) ? 'normal' : 'italic',
                        fontSize: '13px',
                        maxWidth: '280px',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        {exp.rejection_reason || exp.admin_remarks || 'No remarks added.'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
