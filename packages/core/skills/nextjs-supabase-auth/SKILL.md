---
name: nextjs-supabase-auth
description: Expert integration of Supabase Auth with Next.js App Router — server/client boundary, middleware for session refresh, Server Components, Server Actions, RLS. Use when the task mentions Supabase auth, Next.js auth, login, signup, OAuth, protected routes, or auth middleware
tokens: 2155
user-invocable: false
---

# Next.js + Supabase Auth

Expert in integrating Supabase Auth with Next.js App Router: the server/client boundary, session refresh in middleware, Server Components, Client Components, and Server Actions.

## Use this skill when

- Wiring Supabase Auth into a Next.js App Router project (`@supabase/ssr`)
- Setting up login, signup, signout, OAuth, or magic-link / email-OTP flows
- Protecting routes or reading the authenticated user server-side
- Refreshing sessions in middleware
- Writing Row-Level Security (RLS) policies for authenticated tables

## Do not use this skill when

- The project uses the Pages Router or the deprecated `@supabase/auth-helpers-nextjs`
- Auth is handled by another provider (NextAuth/Auth.js, Clerk, Firebase)
- The task is Supabase database design with no auth surface

## Hard Rules

1. Use `@supabase/ssr` for App Router integration. NEVER use `@supabase/auth-helpers-nextjs` (deprecated).
2. Refresh the session in middleware on every request; the matcher MUST exclude static assets.
3. Read the user with `getUser()` in server code, NEVER `getSession()` — `getUser()` re-validates with the auth server; `getSession()` reads cookies only and is forgeable.
4. NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to the client or any `NEXT_PUBLIC_*` var — it bypasses RLS.
5. Prefer Server Actions for auth operations (login, signup, signout).
6. Enable RLS on every table the anon key can reach — non-negotiable for production.

## Workflow

1. Create the browser and server clients (`lib/supabase/client.ts`, `lib/supabase/server.ts`) with the cookie handlers below. Done when both `createClient` helpers compile.
2. Wire `middleware.ts` to refresh the session and redirect unauthenticated users off protected paths. Done when the matcher excludes static assets.
3. Add the OAuth callback route (`app/auth/callback/route.ts`) if using OAuth or magic links. Done when it calls `exchangeCodeForSession`.
4. Build auth operations as Server Actions (login / signup / signout) with `revalidatePath` + `redirect`.
5. Read the user in Server Components with `getUser()`; redirect when it is null.
6. Enable RLS and add SELECT/INSERT policies on every table the anon key can reach.

## Stack

- `@supabase/ssr` — official SSR helper
- `@supabase/supabase-js` — base client (peer dependency)
- Next.js 14+ App Router

## Client Setup — Three Contexts

### Browser Client (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Used in Client Components for realtime, file uploads, or direct client mutations.

### Server Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookies) {
          try {
            cookies.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component — middleware handles refresh */ }
        },
      },
    }
  );
}
```

Used in Server Components, Server Actions, Route Handlers.

### Middleware Client (`middleware.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect specific routes
  const isProtected = request.nextUrl.pathname.startsWith('/dashboard');
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)).*)'],
};
```

## OAuth Callback Route

`app/auth/callback/route.ts` — required for OAuth flows (Google, GitHub, etc.):

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
```

## Server Action — Login / Signup

```typescript
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
```

## Magic Link / Email OTP

```typescript
await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
});
```

## Reading the User in a Server Component

```typescript
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <h1>Hi, {user.email}</h1>;
}
```

Always `getUser()` here, never `getSession()` (Hard Rule 3).

## RLS (Row-Level Security)

Always enable RLS for tables touched by authenticated clients:

```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

Without RLS, the anon key gives full access to any table. RLS is a non-negotiable for production.

## Anti-Patterns to Avoid

### `getSession()` in server code
Forgeable — reads cookies without validation. Use `getUser()` (Hard Rule 3).

### Storing tokens manually
Don't `localStorage.setItem('token', ...)`. `@supabase/ssr` handles cookies for you.

### Hardcoding `service_role` key
`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must NEVER be in client code or `NEXT_PUBLIC_*` env vars.

### Forgetting to revalidate after login
After a Server Action login, call `revalidatePath('/', 'layout')` so cached UI reflects the new user.

### Auth in client without listener
If you read user state on mount, also subscribe to `supabase.auth.onAuthStateChange` so sign-out in another tab updates UI.

## Common Production Issues

| Symptom | Fix |
|--------|-----|
| User logs in but Server Components see no session | Middleware not refreshing cookies — check matcher excludes static files |
| OAuth redirect loops | Mismatch between Supabase project's "Site URL" and your origin |
| RLS error "permission denied for table" | Policy missing or auth.uid() returning null |
| Cookies set in Server Component throw | Expected — let middleware handle it, wrap in try/catch |

## Recap — non-negotiables

- `@supabase/ssr` only; never the deprecated auth-helpers package.
- Middleware refreshes the session every request; matcher excludes static assets.
- Server code reads the user via `getUser()`, never `getSession()`.
- `SUPABASE_SERVICE_ROLE_KEY` never reaches the client; RLS is enabled on every anon-reachable table.

Adapted from vibeship-spawner-skills via VKirill/codex-starter-kit (Apache 2.0).
