# Veridex Frontend Architecture & Security Guide

## Overview

This document describes the frontend architecture for Veridex, a multi-portal SaaS compliance platform.

## Portal Structure

| Portal | URL (Production) | URL (Development) | Roles |
|--------|------------------|-------------------|-------|
| Consumer | `https://app.veridex.com` | `http://localhost:3000/consumer` | CONSUMER |
| Merchant | `https://merchant.veridex.com` | `http://localhost:3000/merchant` | MERCHANT |
| Admin | `https://admin.veridex.internal` | `http://localhost:3000/admin` | ADMIN, SUPER_ADMIN |

## Architecture Layers

### 1. Route Protection (Middleware)

Located at: `src/middleware.ts`

The middleware provides edge-level route protection:

```typescript
// Protected routes require authentication
// Admin routes require ADMIN or SUPER_ADMIN role
// Merchant routes require MERCHANT role
// Consumer routes require CONSUMER role
```

**What it does:**
- Validates JWT tokens from cookies
- Redirects unauthenticated users to role-appropriate login pages
- Enforces role-based access control at the edge
- Prevents unauthorized access before page rendering

### 2. API Client (`src/lib/api.ts`)

**Features:**
- Automatic token attachment to all requests
- 401 handling with token refresh
- Automatic redirect to login on auth failure
- Toast notifications for errors
- Environment-based API URLs

**Error Handling:**
| Status | Action |
|--------|--------|
| 401 | Attempt token refresh, then redirect to login |
| 403 | Show permission denied toast |
| 4xx | Show validation error toast |
| 5xx | Show server error with correlation ID |
| Network | Show "Cannot reach server" toast |

### 3. Auth Context (`src/lib/auth-context.tsx`)

Provides:
- User state management
- Login/logout/register functions
- Role-based permission checking
- Integration with toast system

### 4. Protected Route Component (`src/components/auth/protected-route.tsx`)

Client-side route protection as a fallback:
- Validates user is authenticated
- Validates user has required role
- Redirects to appropriate page if not

## Z-Index Scale (Layering System)

**NEVER use arbitrary z-index values!** Use the CSS variables:

```css
--z-base: 0;          /* Base content */
--z-card: 10;         /* Cards and panels */
--z-sticky: 100;      /* Sticky elements */
--z-header: 200;      /* Top bar */
--z-sidebar: 300;     /* Sidebar navigation */
--z-dropdown: 400;    /* Dropdown menus */
--z-popover: 500;     /* Popovers */
--z-overlay: 600;     /* Backdrop overlays */
--z-modal: 700;       /* Modal dialogs */
--z-notification: 800;/* Notification panels */
--z-toast: 900;       /* Toast messages */
--z-tooltip: 1000;    /* Tooltips */
--z-max: 9999;        /* Maximum (rarely use) */
```

## Portal System (`src/components/ui/portal.tsx`)

All overlays MUST render via portals to escape stacking contexts:

```tsx
import { Portal, PositionedPortal, ModalBackdrop } from '@/components/ui/portal';

// For positioned dropdowns
<PositionedPortal
  show={isOpen}
  anchorRef={buttonRef}
  onClickOutside={() => setIsOpen(false)}
>
  <DropdownContent />
</PositionedPortal>

// For modals
<ModalBackdrop show={isOpen} onClose={() => setIsOpen(false)}>
  <ModalContent />
</ModalBackdrop>
```

## Environment Variables

See `.env.example` for all available options:

```env
# API Gateway URL
NEXT_PUBLIC_API_URL=http://localhost:3002

# Admin API URL (can be separate for extra isolation)
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:3002
```

## Security Rules

### DO ✅

1. **Always use middleware for route protection** - First line of defense
2. **Pass user role to hooks** - `useDashboardStats(user?.role)`
3. **Use portals for overlays** - Escape stacking contexts
4. **Use CSS variable z-index** - Consistent layering
5. **Clear tokens on 401** - Don't leave invalid auth state
6. **Use `Promise.allSettled`** - Handle partial failures gracefully

### DON'T ❌

1. **Never hide admin UI with role checks only** - Use separate routes
2. **Never use arbitrary z-index values** - Use the scale
3. **Never call admin endpoints from merchant code** - Check role first
4. **Never store tokens in localStorage** - Use sessionStorage + cookies
5. **Never skip the portal for overlays** - Causes z-index issues
6. **Never ignore 401 errors** - Always handle them

## File Structure

```
src/
├── app/
│   ├── admin/           # Admin portal routes (ADMIN only)
│   ├── merchant/        # Merchant portal routes (MERCHANT only)
│   ├── consumer/        # Consumer portal routes (CONSUMER only)
│   ├── auth/            # Auth pages (login, register)
│   └── layout.tsx       # Root layout with providers
├── components/
│   ├── auth/            # Protected route components
│   ├── layout/          # Layout components (sidebar, topbar)
│   └── ui/              # UI components (portal, icons)
├── lib/
│   ├── api.ts           # API client with auth handling
│   ├── auth-context.tsx # Auth state management
│   └── hooks.ts         # Data fetching hooks
└── middleware.ts        # Edge route protection
```

## Common Issues & Fixes

### 401 Errors on Dashboard Load

**Cause:** Dashboard calling admin-only endpoints without admin role

**Fix:** Pass user role to hooks:
```tsx
const { stats } = useDashboardStats(user?.role);
```

### Dropdown Hidden Behind Cards

**Cause:** Card creating stacking context that traps dropdown

**Fix:** Use portal:
```tsx
<PositionedPortal show={isOpen} anchorRef={btnRef}>
  <Dropdown />
</PositionedPortal>
```

### Multiple Login Redirects

**Cause:** Race condition between middleware and client-side redirect

**Fix:** Use `isRedirecting` flag in API client to prevent loops

### Notifications Overlap Other Elements

**Cause:** Incorrect z-index or not using portal

**Fix:** 
1. Use `portal-notification` class
2. Set `z-index: var(--z-notification)`
3. Render via portal to document.body

## Testing Checklist

- [ ] Unauthenticated user redirected to login
- [ ] Admin routes blocked for merchant users
- [ ] Merchant routes blocked for consumer users
- [ ] 401 response triggers token refresh
- [ ] Failed refresh redirects to login
- [ ] Dropdowns appear above all content
- [ ] Notifications don't overlap incorrectly
- [ ] Mobile sidebar works correctly
- [ ] Toast notifications appear for errors
