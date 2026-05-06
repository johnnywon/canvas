# Setting up Cloudflare Access for Canvas

This guide walks you through gating the Canvas app to your Google Workspace domain using Cloudflare Access. No one outside your domain will be able to reach the site — Cloudflare enforces this at the edge before any request hits your app.

**Time:** ~20 minutes  
**Prerequisites:** Your Pages project is already deployed. You have admin access to your Google Workspace.

---

## Part 1 — Create a Google OAuth app

Cloudflare Access uses Google as an identity provider. You need to create an OAuth client in Google Cloud Console first.

1. Go to **https://console.cloud.google.com**
2. In the top bar, click the project picker → **New Project**
   - Name: `Cloudflare Access`
   - Click **Create**
3. Make sure the new project is selected in the top bar
4. In the left sidebar: **APIs & Services → OAuth consent screen**
   - User type: **Internal** (this restricts login to your Google Workspace domain only)
   - Click **Create**
   - Fill in:
     - App name: `Canvas`
     - User support email: your email
     - Developer contact: your email
   - Click **Save and Continue** through all steps (no scopes needed)
5. In the left sidebar: **APIs & Services → Credentials**
   - Click **+ Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Cloudflare Access`
   - Under **Authorized redirect URIs**, click **+ Add URI** and enter:
     ```
     https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/callback
     ```
     Replace `<your-team-name>` with your Cloudflare Zero Trust team name. You'll find this in the next section.
   - Click **Create**
   - Copy the **Client ID** and **Client Secret** — you'll need them in Part 2

---

## Part 2 — Enable Zero Trust and add Google as an identity provider

1. Go to **https://dash.cloudflare.com** and select your account
2. In the left sidebar, click **Zero Trust** (it may be under "More products" if you haven't used it before)
3. If prompted, complete the Zero Trust onboarding:
   - Choose a **team name** (e.g., `pulsead`) — this sets your `<team-name>.cloudflareaccess.com` domain
   - Select the **Free plan** (supports up to 50 users)
4. In the Zero Trust dashboard, go to **Settings → Authentication**
5. Under **Login methods**, click **+ Add new**
6. Select **Google**
7. Enter the **Client ID** and **Client Secret** from Part 1
8. Click **Save**

> Go back to Google Cloud Console and add the redirect URI if you hadn't set your team name yet: `https://pulsead.cloudflareaccess.com/cdn-cgi/access/callback`

---

## Part 3 — Create an Access Application

1. In the Zero Trust sidebar, go to **Access → Applications**
2. Click **+ Add an application**
3. Select **Self-hosted**
4. Fill in the application details:
   - **Application name:** `Canvas`
   - **Session duration:** `24 hours`
   - **Application domain:**
     - Subdomain: `*` (asterisk)
     - Domain: select your Pages domain, e.g. `pulson-canvas.pages.dev`
     - Path: leave blank (protects all routes)
   - If you have a custom domain on the Pages project, add a second entry for it
5. Click **Next**

---

## Part 4 — Create an Access Policy

1. On the **Policies** step:
   - Click **+ Add a policy**
   - **Policy name:** `Pulse Ad team`
   - **Action:** Allow
   - Under **Configure rules**, click **+ Add require**
   - Rule type: **Emails ending in**
   - Value: `@pulsead.io` (replace with your actual Google Workspace domain)
2. Click **Save policy**
3. Click **Next**, then **Add application**

---

## Part 5 — Verify it works

1. Open an incognito/private window
2. Navigate to your Pages URL (e.g., `https://pulson-canvas.pages.dev`)
3. You should be redirected to a Cloudflare Access login screen
4. Click **Sign in with Google**
5. Log in with a `@pulsead.io` Google account
6. You should be redirected back to the Canvas app

If you log in with a non-`@pulsead.io` account, Access will show an "Access denied" page.

---

## How the app reads the logged-in user

Once a user passes Cloudflare Access, every request to your app carries a header:

```
Cf-Access-Authenticated-User-Email: user@pulsead.io
```

The Worker reads this header in `functions/api/[[path]].ts`:

```typescript
function getEmail(req: Request): string {
  return req.headers.get('Cf-Access-Authenticated-User-Email') ?? 'test@pulsead.io'
}
```

The fallback to `test@pulsead.io` only applies in local development where Access is not active. In production, this header is always present and cannot be spoofed by the client (Cloudflare strips any client-sent version of it).

---

## Optional — Add a custom domain

If you want `canvas.pulsead.io` instead of `pulson-canvas.pages.dev`:

1. In Cloudflare dashboard → **Pages → pulson-canvas → Custom domains**
2. Click **Set up a custom domain** and follow the DNS prompts
3. Once active, go back to **Zero Trust → Access → Applications → Canvas**
4. Edit the application and add the custom domain as a second **Application domain** entry

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Redirect loop on login | Make sure the redirect URI in Google Cloud Console exactly matches `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback` |
| "Access denied" for valid team members | Check the policy rule — confirm the email domain matches exactly |
| Localhost shows the Access login page | Access only applies to the deployed Pages URL, not `localhost`. This is expected. |
| `Cf-Access-Authenticated-User-Email` is missing in prod | The app is not behind Access. Re-check that the Application domain in Step 4 matches your Pages URL |

---

## Phase 2 setup

### New secrets

Three Worker secrets are required. Run each command, then paste the value at the prompt — input is masked and never echoes back.

#### 1. Anthropic API key (for comment translation)

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Prompt: `Enter a secret value:` — paste your key (starts with `sk-ant-...`). Press Enter.  
You'll see: `✅ Success! Uploaded secret ANTHROPIC_API_KEY`

#### 2. Cloudflare account ID (for Browser Rendering)

```bash
wrangler secret put CF_ACCOUNT_ID
```

Prompt: `Enter a secret value:` — paste your 32-character hex account ID.  
Find it at: dash.cloudflare.com → left sidebar shows "Account ID" at the bottom, or top-right profile dropdown.

#### 3. Cloudflare API token (for Browser Rendering)

First, create the token:
1. Go to dash.cloudflare.com → top-right avatar → **My Profile**
2. Click **API Tokens → Create Token → Custom token**
3. Token name: `Canvas Browser Rendering`
4. Permissions: **Browser Rendering: Edit** (under Account)
5. Account Resources: Include → your account
6. Click **Continue to Summary → Create Token**
7. Copy the token — it's only shown once

Then run:
```bash
wrangler secret put CF_API_TOKEN
```

Prompt: `Enter a secret value:` — paste the token. Press Enter.  
You'll see: `✅ Success! Uploaded secret CF_API_TOKEN`

#### Local development

Create `.dev.vars` in the project root (already in `.gitignore`):

```
ANTHROPIC_API_KEY=sk-ant-...
CF_ACCOUNT_ID=your-32-char-hex-id
CF_API_TOKEN=your-api-token
```

Wrangler picks this file up automatically when running `npm run dev:worker`.

---

### Enable Cloudflare Browser Rendering

Browser Rendering is a paid Cloudflare Workers feature. You need to enable it before screenshots will work.

1. Go to dash.cloudflare.com → **Workers & Pages** (left sidebar)
2. Click **Plans** (or look for a "Browser Rendering" section)
3. Ensure you are on the **Workers Paid plan** ($5/month) — Browser Rendering is not available on the free tier
4. Once on the paid plan, Browser Rendering is automatically available to your account — no separate activation needed
5. Verify it works by hitting `POST /api/screenshot` with `{ "url": "https://example.com" }` after deploying

> **Note:** In local dev (`npm run dev:all`), the screenshot endpoint will call the real Cloudflare Browser Rendering REST API using the credentials in `.dev.vars`. There is no local emulator for this service.

---

### No migration needed for Phase 2

The schema from Phase 1 already includes all columns needed for Phase 2:
- `edges.label` — edge labels ✓
- `nodes.type` CHECK includes `'website'` and `'sticky_comment'` ✓
- `comments` table — fully spec'd for translation ✓
