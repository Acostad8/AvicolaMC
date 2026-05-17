import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Textarea = forwardRef(function Textarea({ label, error, rows = 3, className = '', ...props }, ref) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <textarea
        ref={ref}
        rows={rows}
        className={cn('input-base resize-none', error && 'input-error', className)}
        {...props}
      />
      {error && <p className="error-msg">{error}</p>}
    </div>
  )
})

export default Textarea
