# 📘 Frontend Architecture — Veridex

**Type:** Cross-Cutting Function  
**Apps:** `frontend-dashboard`, `admin-portal`  
**Framework:** Next.js 15, React 19

---

## 1. Purpose & Scope

### What This Document Covers

- Frontend application structure
- Routing architecture
- Data fetching patterns
- State management
- Authentication handling
- Theme system

### Frontend Applications

| Application | Port | Purpose |
|-------------|------|---------|
| `frontend-dashboard` | 3000 | Consumer & Merchant portal |
| `admin-portal` | 4000 | Admin-only dashboard |

---

## 2. Directory Structure

### Frontend Dashboard

```
apps/frontend-dashboard/src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout (providers)
│   ├── globals.css        # Global styles
│   ├── login/             # Auth pages
│   ├── register/
│   ├── consumer/          # Consumer portal
│   │   ├── page.tsx       # Dashboard
│   │   ├── products/
│   │   ├── compliance/
│   │   └── ...
│   ├── merchant/          # Merchant portal
│   │   ├── page.tsx       # Dashboard
│   │   ├── products/
│   │   ├── profile/
│   │   └── ...
│   └── settings/
├── components/
│   ├── ui/               # Base UI components
│   ├── layout/           # Sidebar, Header
│   └── features/         # Domain components
├── lib/
│   ├── api.ts            # API client
│   ├── hooks.ts          # Data fetching hooks
│   └── utils.ts          # Utilities
└── contexts/
    ├── AuthContext.tsx
    └── ThemeContext.tsx
```

### Admin Portal

```
apps/admin-portal/src/
├── app/
│   ├── page.tsx          # Redirect to login
│   ├── layout.tsx        # Root layout
│   ├── login/            # Admin login
│   └── (admin)/          # Route group
│       ├── layout.tsx    # Admin layout
│       ├── dashboard/
│       ├── users/
│       ├── products/
│       ├── compliance-queue/
│       └── ...
├── components/
│   ├── ui/
│   ├── layout/
│   └── dashboard/
└── lib/
```

---

## 3. Routing Architecture

### Route Groups

| Pattern | Purpose | Example |
|---------|---------|---------|
| `/consumer/*` | Consumer pages | Product browsing |
| `/merchant/*` | Merchant pages | Product management |
| `/admin/*` | Limited admin (redirect) | |
| `/(admin)/*` | Admin portal routes | Full admin UI |

### Dynamic Routes

```
/products/[id]           → Product detail
/merchant/products/[id]  → Merchant product detail
```

### Route Protection

```tsx
// In page component
'use client';

export default function MerchantPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== 'MERCHANT') return <Unauthorized />;
  
  return <PageContent />;
}
```

---

## 4. Layout Hierarchy

### Frontend Dashboard

```
RootLayout (layout.tsx)
├── Providers (Auth, Theme, Toast)
│
├── /consumer/* 
│   └── ConsumerLayout (sidebar, header)
│       └── Page Content
│
├── /merchant/*
│   └── MerchantLayout (sidebar, header)
│       └── Page Content
│
└── /auth/*
    └── AuthLayout (centered card)
        └── Login/Register forms
```

### Layout Implementation

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

// app/consumer/layout.tsx
export default function ConsumerLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar role="consumer" />
      <main className="flex-1">
        <Header />
        {children}
      </main>
    </div>
  );
}
```

---

## 5. Data Fetching

### API Client

```typescript
// lib/api.ts
export const api = {
  async get<T>(path: string): Promise<T> {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }
    
    return response.json();
  },
  
  async post<T>(path: string, data: unknown): Promise<T> { ... },
  async put<T>(path: string, data: unknown): Promise<T> { ... },
  async delete(path: string): Promise<void> { ... },
};
```

### Custom Hooks

```typescript
// lib/hooks.ts
export function useProducts(params?: QueryParams) {
  const [data, setData] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    api.get<{ data: Product[] }>('/products', params)
      .then(res => setData(res.data))
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [JSON.stringify(params)]);
  
  return { data, isLoading, error };
}

// For public endpoints (no auth)
export function usePublicProducts(params?: QueryParams) {
  // Same pattern, calls /public/products
}
```

### Hook Usage

```tsx
// In component
function ProductList() {
  const { data: products, isLoading, error } = useProducts({ limit: 20 });
  
  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div className="grid">
      {products.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
```

---

## 6. Authentication State

### Auth Context

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  tokens: Tokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('accessToken');
    if (stored) {
      // Validate and fetch user
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);
  
  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', response.tokens.accessToken);
    localStorage.setItem('refreshToken', response.tokens.refreshToken);
    setUser(response.user);
    setTokens(response.tokens);
  };
  
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setTokens(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, tokens, isLoading, login, logout, ... }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 7. Theme System

### CSS Variables Approach

```css
/* globals.css */
:root {
  --background: #ffffff;
  --foreground: #171717;
  --card: #ffffff;
  --border: #e5e5e5;
  --primary: #2563eb;
  --muted: #f5f5f5;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --card: #171717;
  --border: #262626;
  --primary: #3b82f6;
  --muted: #262626;
}
```

### Theme Provider

```typescript
// contexts/ThemeContext.tsx
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      setTheme(stored as 'light' | 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## 8. Component Patterns

### Client Components

```tsx
'use client'; // MUST be at top

export function InteractiveComponent() {
  const [state, setState] = useState();
  // Can use hooks, browser APIs
}
```

### Server Components (Limited)

```tsx
// No 'use client' directive
// Cannot use hooks or browser APIs
// Good for static content

export default async function StaticPage() {
  // Can fetch data directly
  const data = await fetchData();
  return <div>{data.content}</div>;
}
```

### Current Pattern (Mostly Client)

Most pages are client components due to:
- Auth requirements
- Interactive features
- API calls with tokens

---

## 9. Known Issues

### Performance Issues

| Issue | Cause | Impact |
|-------|-------|--------|
| Slow initial load | Large client bundle | 3-5s first paint |
| Navigation delay | Re-render on route change | Perceived lag |
| Theme flash | CSS vars applied late | Visual flicker |

### Auth Issues

| Issue | Cause | Impact |
|-------|-------|--------|
| Random logout | Context remount | Lost session |
| Stale user state | No refresh on focus | Outdated data |
| 401 loops | Bad refresh logic | Stuck users |

### Recommended Fixes

1. Add SWR/React Query for caching
2. Implement proper token refresh interceptor
3. Add inline script for theme to prevent flash
4. Code-split large pages

---

## 10. Integration Checklist

### For New Pages

- [ ] Add page file in appropriate directory
- [ ] Use correct layout (consumer/merchant/admin)
- [ ] Add route protection if authenticated
- [ ] Create data fetching hooks
- [ ] Handle loading and error states
- [ ] Test on both light and dark themes

### For New Components

- [ ] Add 'use client' if interactive
- [ ] Use CSS variables for theming
- [ ] Accept className prop for composability
- [ ] Handle loading states
- [ ] Write accessible markup

---

*Document Version: 1.0*  
*Last Updated: January 2026*
