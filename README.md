# Personal Finance Tracker

A mobile-first personal expense, account balance, and upcoming-bill tracker powered by Supabase.

## Features in this first version
- Passwordless email sign-in via Supabase Auth
- Separate available cash and credit-card debt totals
- Checking, savings, cash, and credit-card accounts with opening balances
- Income, expense, transfer, and adjustment entries
- Payee autocomplete and saved categories, including split purchases
- Searchable transactions with date, payee, account, type, and category filters
- Transaction CSV export
- Recurring bills, partial payments, and credit-card minimum payments
- In-app due/overdue alerts starting five days before the due date
- Monthly category and payee spending comparisons

## Hosting
The site is static: `index.html`, `app.js`, and `styles.css`. GitHub Pages can host it from the root of the `main` branch.

**To publish**: GitHub repository → Settings → Pages → Deploy from a branch → `main` / `/(root)` → Save.

## Required Supabase setup
Project: `bkbvgnckoiypdwappktn`.

1. In Supabase → Authentication → URL Configuration, add the GitHub Pages URL (for this repo, ordinarily `https://unoclubpb.github.io/FinanceTracker/`) to **Redirect URLs**.
2. Verify email one-time-password / magic-link sign-in is enabled in the Authentication providers settings.
3. Use the app's email sign-in to establish a per-user session. Financial data is protected by row-level security and is never anonymously accessible.

The checked-in `sb_publishable_` key is a public client identifier, not a database password or service-role secret. Never commit secret keys or actual financial exports.

## Important notes
- In-app reminder banners are available. iPhone background push notifications are **not** implemented yet.
- Bank syncing is not implemented; enter transactions manually.
- Bill recording and recurring-generation are browser-coordinated database writes, not yet a single server-side transaction. Avoid repeated taps and verify bill history.
- Account balance adjustments are supported, but there is not yet a guided reconciliation workflow or audit view.
- The app is not a replacement for bank records; reconcile important balances regularly.
- Public code does not mean public data, but proper authentication and Supabase RLS are essential.

## Version
Initial functional release, v1.0.
