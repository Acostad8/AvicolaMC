import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PageHeader({ title, breadcrumbs = [], actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 mb-1.5">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                {b.href ? (
                  <Link to={b.href} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-stone-600 dark:text-stone-300 font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="page-title">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
