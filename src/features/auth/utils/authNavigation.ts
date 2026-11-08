export function getRoleRedirect(requiredRole: string, currentRole: string | null) {
  if (currentRole === requiredRole) return null
  if (!currentRole) return '/login'
  return currentRole === 'admin' ? '/admin' : '/'
}

export function getPostLoginDestination(role: string, requestedPath: unknown) {
  const safePath = typeof requestedPath === 'string'
    && requestedPath.startsWith('/')
    && !requestedPath.startsWith('//')
    && !requestedPath.includes('\\')
    ? requestedPath
    : null
  const isAdminPath = safePath !== null && /^\/admin(?:\/|[?#]|$)/.test(safePath)

  if (role === 'admin') {
    return isAdminPath ? safePath : '/admin'
  }

  return safePath && !isAdminPath ? safePath : '/'
}
