export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {Icon && (
        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-stone-400 dark:text-stone-500" />
        </div>
      )}
      <p className="font-semibold text-stone-700 dark:text-stone-300">{title}</p>
      {description && <p className="text-sm text-stone-400 dark:text-stone-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
