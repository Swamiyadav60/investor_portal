import clsx from 'clsx'

interface ToggleGroupProps {
  options: { key: string; label: string }[]
  value: string
  onChange: (key: string) => void
  className?: string
}

export function ToggleGroup({ options, value, onChange, className }: ToggleGroupProps) {
  return (
    <div className={clsx('graph-toggle', className)}>
      {options.map((opt) => (
        <button
          key={opt.key}
          className={clsx('graph-btn', value === opt.key && 'active')}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
