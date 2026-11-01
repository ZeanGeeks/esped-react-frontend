export function ResourceNotice({ state, onRetry }) {
  if (!state) return null

  if (state.error) {
    return (
      <div className="resource-notice resource-notice--error" role="alert">
        <span>{state.error}</span>
        <button type="button" onClick={onRetry}>Retry this section</button>
      </div>
    )
  }

  if (state.loading) {
    return <p className="resource-notice" role="status">Loading this section…</p>
  }

  return null
}
