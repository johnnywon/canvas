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
