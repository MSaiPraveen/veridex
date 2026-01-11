# Veridex Admin Portal - Performance Architecture

## Overview

This document describes the optimized architecture of the Veridex Admin Portal, designed for maximum performance and minimal compilation overhead.

## Architecture Principles

### 1. Server Components by Default

All pages and layouts are **React Server Components** by default. This means:

- **No `'use client'` at page level** - Pages are async server components
- **Data fetched on the server** - No client-side fetching in pages
- **HTML streamed immediately** - Users see content instantly

### 2. Client Component Isolation

Client components are **isolated** and **minimal**:

```
components/
├── dashboard/
│   ├── server-components.tsx   # Server-rendered UI (no 'use client')
│   └── client-components.tsx   # Interactive elements only
├── layout/
│   └── admin-layout-client.tsx # Layout interactivity (sidebar toggle, etc.)
└── ui/
    └── ...                     # Reusable UI components
```

### 3. Icon Optimization

**Before (Bad):**
```tsx
import { Users, Building2, Package, FileText, ... } from 'lucide-react';
```

**After (Good):**
```tsx
// Inline SVG icons - no external imports needed
const Icons = {
  Users: () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38..." />
    </svg>
  ),
  // ...
};
```

Benefits:
- No tree-shaking overhead
- Smaller bundle size
- Faster compilation

---

## File Structure

```
src/
├── app/
│   ├── globals.css                 # Design tokens + theme variables
│   ├── layout.tsx                  # Root layout (server)
│   └── (admin)/
│       ├── layout.tsx              # Admin layout (server + client wrapper)
│       └── dashboard/
│           └── page.tsx            # Dashboard (SERVER COMPONENT)
├── components/
│   ├── dashboard/
│   │   ├── server-components.tsx   # Server-rendered dashboard parts
│   │   └── client-components.tsx   # Interactive dashboard parts
│   ├── layout/
│   │   └── admin-layout-client.tsx # Layout client shell
│   └── ui/
│       └── ...
└── lib/
    └── server/
        └── dashboard-data.ts       # Server-side data fetching
```

---

## Data Fetching Pattern

### Server-Side Data (Recommended)

```tsx
// lib/server/dashboard-data.ts
import { cache } from 'react';

export const getDashboardData = cache(async () => {
  // Fetch from database/API
  return { stats, alerts, ... };
});

// app/(admin)/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}
```

### Client-Side Data (Only When Necessary)

Use client-side fetching only for:
- Real-time updates (WebSocket)
- User-specific data after page load
- Polling for live data

---

## Permission Handling

### Server-Side (Recommended)

```tsx
// lib/server/dashboard-data.ts
export const getServerPermissions = cache(async () => {
  // Validate session, fetch permissions
  return {
    canViewAudit: true,
    canReviewDocs: true,
    permissions: new Set(['AUDIT_READ', 'DOC_REVIEW']),
  };
});

// page.tsx (Server Component)
export default async function Page() {
  const permissions = await getServerPermissions();
  
  return (
    <div>
      {permissions.canViewAudit && <AuditSection />}
    </div>
  );
}
```

### Client-Side (Only for Interactivity)

```tsx
// Only use for dynamic UI that changes after hydration
const { role } = useAdminPermissions();
```

---

## Theme System

### CSS Variables (Design Tokens)

All colors are defined in `globals.css`:

```css
:root {
  --bg-primary: #f8fafc;
  --text-primary: #0f172a;
  --border-default: #e2e8f0;
  /* ... */
}

.dark {
  --bg-primary: #0f172a;
  --text-primary: #f8fafc;
  --border-default: #334155;
  /* ... */
}
```

### Prevent FOUC (Flash of Unstyled Content)

```css
/* Hide body until theme class is applied */
html:not(.light):not(.dark) body {
  visibility: hidden;
}
```

```tsx
// Theme applied before React hydrates
<script dangerouslySetInnerHTML={{ __html: themeScript }} />
```

---

## Component Guidelines

### ✅ DO

1. **Use server components for static content**
2. **Fetch data on the server**
3. **Use inline SVG icons**
4. **Memoize client components**
5. **Use CSS variables for theming**

### ❌ DON'T

1. **Add `'use client'` to page.tsx files**
2. **Import large icon libraries**
3. **Use useState for data that can be server-fetched**
4. **Create context providers inside layouts**
5. **Use client-side permission checks for initial render**

---

## Performance Checklist

For each new admin page:

- [ ] Page is a Server Component (no `'use client'`)
- [ ] Data fetched using `cache()` from React
- [ ] Icons are inline SVG or in leaf components
- [ ] Permissions checked on server
- [ ] Interactive parts isolated in client components
- [ ] No `useState`/`useEffect` for initial data

---

## Compilation Optimization

### Before Optimization
- "Compiling..." on every navigation
- 2-5 second delay per route
- Heavy client bundles

### After Optimization
- Instant navigation (no "Compiling...")
- Server-streamed HTML
- Minimal client JS

---

## Testing Performance

1. **Cold start**: First page load should be < 1s
2. **Navigation**: Route changes should be instant
3. **Theme toggle**: No flicker, instant switch
4. **Bundle size**: Check with `npm run build`

---

## Future Improvements

1. **Streaming with Suspense**: Add `<Suspense>` boundaries for progressive loading
2. **Parallel Routes**: Use Next.js parallel routes for dashboard sections
3. **Edge Runtime**: Consider edge runtime for static pages
4. **ISR**: Use Incremental Static Regeneration for semi-static pages

---

## Migration Guide

To migrate existing client pages to server components:

1. Remove `'use client'` from page.tsx
2. Move data fetching to `lib/server/`
3. Replace `useState` with server-fetched data
4. Extract interactive parts to `components/client/`
5. Replace lucide imports with inline SVG
6. Test theme in both light and dark modes

---

## Contact

For architecture questions, refer to:
- [docs/frontend-architecture.md](../docs/frontend-architecture.md)
- [docs/admin-security-architecture.md](../docs/admin-security-architecture.md)
