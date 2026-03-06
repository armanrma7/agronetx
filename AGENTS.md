# AGENTS.md

Guidance for autonomous coding agents working in this repository.

## Project overview

- App: React Native (0.83) with TypeScript
- Package manager: npm (preferred; `package-lock.json` is present)
- State/auth: Zustand (`src/store/auth/useAuthStore.ts`) with a backward-compatible `AuthContext` wrapper (`src/context/AuthContext.tsx`)
- Networking: Axios service layer in `src/lib/api/*`

## Key paths

- Entry points:
  - `App.tsx`
  - `index.js`
- Navigation:
  - `src/navigation/*`
- Screens/pages:
  - `src/pages/*`
- Shared UI:
  - `src/components/*`
- API/config:
  - `src/config/api.config.ts`
  - `src/lib/api/*`
- Auth state:
  - `src/store/auth/useAuthStore.ts`
  - `src/context/AuthContext.tsx`
  - `src/store/auth.store.ts` (compatibility re-export)

## Working rules

1. Keep changes scoped and minimal; avoid broad refactors unless requested.
2. Preserve backward compatibility for `useAuth()` consumers unless the task explicitly allows breaking changes.
3. Prefer updating code in the new auth store (`src/store/auth/useAuthStore.ts`) rather than legacy compatibility shims.
4. Do not hardcode API URLs in feature files; keep base URL and transport behavior in config/API layer.
5. Reuse existing patterns for API calls (typed request/response, centralized error handling).
6. Match existing TypeScript + React Native style in touched files.

## Validation commands

Run the smallest relevant set first, then broader checks if needed:

```bash
npm run lint
npm test -- --watch=false
```

When touching TypeScript-heavy logic, also run:

```bash
npx tsc --noEmit
```

## Notes for auth/API changes

- Access and refresh tokens are managed in AsyncStorage by the auth store.
- Axios interceptors and auth header behavior live in the API client layer.
- `AuthContext` is a wrapper for compatibility; ensure its public shape stays stable unless explicitly asked to change it.

## Out of scope by default

- Do not remove Supabase-related code/dependencies unless the task explicitly requests cleanup migration work.
- Do not edit native iOS/Android project files for JS/TS-only tasks unless required.
