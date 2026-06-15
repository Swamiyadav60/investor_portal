import { fmt } from '@/lib/format'
import type { ExpenseBreakdown as ExpenseBreakdownType } from '@/types/database'

interface ExpenseBreakdownProps {
  variableTotal: number
  fixedTotal: number
  varBreakdown: ExpenseBreakdownType[]
  fixBreakdown: ExpenseBreakdownType[]
}

function ExpenseItems({ items, total }: { items: ExpenseBreakdownType[]; total: number }) {
  return (
    <>
      {items.map((e) => {
        const amt = Math.round(total * e.pct / 100)
        return (
          <div key={e.name} className="expense-item">
            <span className="expense-dot" style={{ background: e.color }} />
            <span className="expense-name">{e.name}</span>
            <div className="expense-bar-wrap">
              <div className="expense-bar" style={{ width: `${e.pct}%`, background: e.color }} />
            </div>
            <span className="expense-amt">{fmt(amt)}</span>
          </div>
        )
      })}
    </>
  )
}

export function ExpenseBreakdown({ variableTotal, fixedTotal, varBreakdown, fixBreakdown }: ExpenseBreakdownProps) {
  return (
    <div className="expense-cards-wrap">
      <div className="expense-card">
        <div className="expense-card-title">
          Variable expenses<span className="expense-card-total">{fmt(variableTotal)}</span>
        </div>
        <ExpenseItems items={varBreakdown} total={variableTotal} />
      </div>
      <div className="expense-card">
        <div className="expense-card-title">
          Fixed expenses<span className="expense-card-total">{fmt(fixedTotal)}</span>
        </div>
        <ExpenseItems items={fixBreakdown} total={fixedTotal} />
      </div>
    </div>
  )
}