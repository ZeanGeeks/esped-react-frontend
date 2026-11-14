# Tailwind CSS adoption

## Status

- [x] Install Tailwind CSS 4 and its Vite plugin with npm.
- [x] Register the plugin in `vite.config.ts`.
- [x] Import Tailwind from `src/index.css`.
- [x] Replace the cramped small-screen navigation row with a responsive menu button and collapsible link panel.
- [x] Keep the brand and navigation labels from wrapping; compact desktop navigation at intermediate widths and collapse to a menu on narrow screens.
- [x] Prevent the admin navigation from colliding with the brand; use compact links on wide desktop and a menu when space is limited.
- [x] Keep the navigation sticky while scrolling and refine desktop link spacing, hover, and active states.
- [x] Return to the top on route changes so page titles remain visible when navigating from a scrolled page.
- [x] Improve homepage hero text contrast and distinguish the primary and secondary calls to action.
- [x] Align login and registration content consistently across desktop form columns.
- [x] Align auth form, verification, social sign-in, and account-switch content to a shared width.
- [x] Remove the duplicate Login/Register eyebrow above the auth page title.
- [x] Reduce auth page banner height and content spacing so the form appears sooner without forced scrolling.
- [x] Tighten the auth introduction panel on phones to bring registration fields higher.
- [x] Verify responsive layout and production build after these UI changes.
- [ ] Define shared design tokens and reusable UI patterns.
- [ ] Review and refine typography across the site.
- [ ] Review font loading and production bundle performance.

Tailwind is available in the frontend. UI improvements are being applied incrementally rather than replacing every existing page style at once. The mobile navigation is responsive and keyboard accessible; the homepage hero now has a stronger dark overlay and distinct primary/secondary actions; login and registration have a compact title banner, earlier form placement, consistent control widths, and a full-width submit action.

## Setup

Dependencies are recorded in `package.json` and `package-lock.json`. For a fresh checkout, use:

```sh
npm ci
```

Tailwind is loaded through the Vite plugin and the global stylesheet. Use Tailwind utility classes in React `className` values as components are updated. No CDN is needed at runtime.

## Remaining work

1. Define shared design tokens and reusable UI patterns.
2. Review typography and font loading, including whether to self-host fonts.
3. Continue updating public and authenticated/admin screens in small, verified steps.
4. Compare production build and page loading before and after performance-focused changes.

The current styles load fonts from Google Fonts. Font optimization is still pending.

## Latest verification

- Production build and TypeScript check pass.
- Vitest passes: 3 files, 22 tests.
- Browser check confirms the navigation and hero actions fit at 390px and 1365px viewport widths; the hero actions stack on mobile and remain side by side on desktop.
- Header navigation remains inline at 1024px with compact spacing; it switches to the menu at 980px to avoid wrapping.
- Navigation stays pinned to the viewport while scrolling at 1365px, 1024px, 980px, and 390px; the mobile menu opens directly below the sticky header.
- Admin navigation stays separated from the brand at desktop widths and switches to its menu at 1050px.
- Route changes reset scroll instantly; a scrolled registration page opens Login with the title visible.
- Login and registration were checked at 375px, 468px, 768px, and 1365px; inputs, verification, submit, social sign-in, and account switch use a consistent width without horizontal overflow.
- Auth fields and primary action share a 400px maximum width; CAPTCHA and social sign-in are centered or sized to align within it.
- Compact auth title banners measure 160px on desktop and 136px on mobile; phone intro spacing is reduced to expose form fields earlier without auto-scrolling.
- Lint completes with existing `react(set-state-in-effect)` warnings in `src/features/admin/pages/AdminBookingsPage.tsx` and `src/app/useAppData.ts`.
