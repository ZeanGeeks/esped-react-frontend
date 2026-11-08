export { getCurrentUser, login, logout, register } from './api/authApi'
export { getRoleRedirect } from './utils/authNavigation'
export const loadAuthPage = () => import('./pages/AuthPage')
