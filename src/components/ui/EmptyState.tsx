import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  children?: ReactNode
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  )
}
