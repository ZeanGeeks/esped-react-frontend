# Authentication and access control

## Roles

The application has two roles: `guest` and `admin`. New registrations are
created as guests. A user's role and active status are determined by the
backend database, not by a value supplied by the browser.

| Area | Guest | Admin |
| --- | --- | --- |
| Public pages (`/`, `/about`, `/services`, `/recommendation`, `/contact`) | Allowed | Allowed |
| Booking creation | Allowed when signed in | Not available as a guest booking |
| `/my-bookings` | Allowed | Redirected to `/admin` |
| `/admin` and `/admin/**` | Redirected away; admin UI is not rendered | Allowed |
| `/api/v1/admin/**` | Denied by the backend | Allowed when the account is active |

## Frontend route behavior

Protected pages wait for the initial `GET /api/v1/auth/me` request to finish
before deciding whether to redirect. This prevents a page refresh from sending
an admin to the login page while the existing identity is still being checked.

Unauthenticated users who open a protected URL are sent to login. After login,
the app returns them to that URL only if it belongs to their role; otherwise,
admins go to `/admin` and guests go to `/`. The navigation menu follows the
signed-in role, so an admin can return to the dashboard from a public page.

The frontend route checks improve navigation and prevent protected UI from
rendering for the wrong role. They are not the security boundary.

## Backend authorization

The backend is authoritative. Every admin API handler must call
`require_auth('admin')` before reading or changing protected data. That guard
validates the bearer token, reloads the account from the database, and checks
that it is active and currently has the required role. Do not rely on hidden
buttons, navigation visibility, or frontend route guards to secure an endpoint.

Public registration assigns the `guest` role. Admin status must only be granted
through a trusted administrative process. Never expose database credentials or
admin tokens in frontend code, browser storage, logs, or documentation.

The frontend API client currently keeps access and refresh tokens in memory.
Reloading the page clears them, so a user may need to sign in again; this does
not grant guest users admin access.

## Verification checklist

1. Sign in as an admin. `/admin` should show the admin dashboard, and admin
   navigation should remain available when visiting a public page.
2. Reload while on an admin page. The page should show an account-check status,
   then keep the admin page if the session is valid, or send the user to login
   if it is not.
3. Sign in as a guest and open `/admin` or an `/admin/**` URL directly. Admin
   content must not render; the guest should be sent to `/`.
4. Open `/my-bookings` while signed out. Login should return a guest to
   `/my-bookings`; an admin should be sent to `/admin`.
5. Test the API independently of the frontend: an unauthenticated request to
   `GET /api/v1/admin/dashboard` should return `401`, a guest-token request
   should return `403`, and an active admin-token request should succeed.
   Never paste bearer tokens into tickets, screenshots, or shared logs.

Run the frontend checks with:

```sh
npm run typecheck
npm test
npm run lint
npm run build
```
