import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from 'chart.js'
import { ToggleGroup } from '@/components/ui/ToggleGroup'
import { fmtK } from '@/lib/format'
import { MONTHS } from '@/lib/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']

interface PerformanceChartProps {
  values: number[]
  label: string
  metric: 'revenue' | 'profit'
  interval: 'monthly' | 'weekly'
  onMetricChange: (m: 'revenue' | 'profit') => void
  onIntervalChange: (i: 'monthly' | 'weekly') => void
}

export function PerformanceChart({
  values, label, metric, interval, onMetricChange, onIntervalChange,
}: PerformanceChartProps) {
  const chartData = useMemo(() => {
    const color = metric === 'profit' ? '#1A9B6C' : '#1A1A18'
    const colorAlpha = metric === 'profit' ? 'rgba(26,155,108,0.12)' : 'rgba(26,26,24,0.07)'
    return {
      labels: interval === 'monthly' ? MONTHS : WEEKS,
      datasets: [{
        data: values,
        backgroundColor: values.map((_, i) => i === values.length - 1 ? color : colorAlpha),
        borderColor: values.map((_, i) => i === values.length - 1 ? color : 'transparent'),
        borderWidth: 0,
        borderRadius: 5,
        borderSkipped: false,
      }],
    }
  }, [values, metric, interval])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A1A18',
        titleColor: '#888780',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => ' ' + fmtK(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#9B9990' } },
      y: {
        grid: { color: '#F0EFEB', drawBorder: false },
        border: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#9B9990', callback: (v: number | string) => fmtK(Number(v)) },
      },
    },
  }), [])

  return (
    <div className="graph-card">
      <div className="graph-header">
        <div>
          <div className="graph-title">Performance</div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
            {label} · {metric === 'revenue' ? 'Gross revenue' : 'Net profit'}
          </div>
        </div>
        <div className="graph-controls">
          <ToggleGroup
            options={[{ key: 'revenue', label: 'Revenue' }, { key: 'profit', label: 'Profit' }]}
            value={metric}
            onChange={(k) => onMetricChange(k as 'revenue' | 'profit')}
          />
          <ToggleGroup
            options={[{ key: 'monthly', label: 'Monthly' }, { key: 'weekly', label: 'Weekly' }]}
            value={interval}
            onChange={(k) => onIntervalChange(k as 'monthly' | 'weekly')}
            className="interval-toggle"
          />
        </div>
      </div>
      <div className="canvas-wrap">
        <Bar data={chartData} options={options as never} />
      </div>
    </div>
  )
}
