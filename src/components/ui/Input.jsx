import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <input
        ref={ref}
        className={cn('input-base', error && 'input-error', className)}
        {...props}
      />
      {error && <p className="error-msg">{error}</p>}
    </div>
  )
})

export default Input
