# Virtuos Quote Builder

An internal quote/proposal generator for **Virtuos Digital**, a reseller of Asana, Smartsheet, and Professional Services. Sales and account teams use it to configure pricing, apply discounts, and generate branded, print-ready quotes (PDF/HTML and Word) for customers — with role-based access control and multi-currency, multi-year support.

## Tech Stack

- **React 18 + Vite** — SPA, plain inline styles (no CSS framework)
- **Supabase** (PostgreSQL + Auth + RLS) — data storage and authentication
- **docx** — client-side Word (`.docx`) export via `Packer.toBlob()`
- **Vercel** — hosting / deployment

## Core Features

### Quote Builder
- Add Asana, Smartsheet, or Professional Services line items with per-seat/tier pricing
- Percentage or flat discounts per line item
- Multi-currency support (USD, INR, and others) with configurable FX rate and Indian (`en-IN`) number formatting (e.g. `₹1,00,000`)
- Configurable tax (e.g. GST 18%)
- Billing cycles: monthly (fractional months supported), quarterly, annual, or custom date range
- **Multi-year contracts** (1/2/3-year terms) with optional year-over-year price escalation; auto-calculates end date and a full year-by-year investment summary
- Draft/save quotes, view "My Quotes" / "All Quotes" (role-dependent)

### Quote Export
- **PDF/Print** — opens a formatted, print-ready HTML document (browser print-to-PDF) with:
  - Page 1: branded header, product & services table, pricing/tax summary, multi-year investment summary (if applicable)
  - Page 2: Terms & Conditions, quote summary, and signature/acceptance blocks
- **Word (.docx)** — generated in-browser, mirrors the PDF structure including multi-year tables

### Customer & Account Management (CRM-lite)
- `accounts` and `contacts` tables for tracking customers tied to quotes

### Role-Based Access Control (RBAC)
Roles: `admin`, `hr_admin`, `manager`, `contributor`
- **Admin / HR-Admin** — full visibility across all quotes and users
- **Manager** — sees own quotes + direct reports' quotes
- **Contributor** — sees only their own quotes
- User management view (`Users & Roles`) for admins/HR-admins to assign roles and manager relationships
- Enforced via Postgres Row-Level Security policies, not just UI hiding

## Product Catalog

- **Asana** — multiple tiers + Enterprise & Compliance add-on
- **Smartsheet** — Pro / Business / Enterprise / Enterprise with Premium Support, plus add-ons (Standard/Premium Support, Advance/AWM, Dynamic View)
- **Professional Services** — hours × rate-based line item

## Project Structure

```
App.jsx          Main application (routing, views, quote builder, preview, exports)
Login.jsx        Auth screen
supabase.js      Supabase client init
logoData.js       Brand assets (SVG logo data)
main.jsx         React entry point
supabase_phase2_migration.sql   accounts/contacts/quotes schema
supabase_phase3_rbac.sql        user_profiles, role enum, RLS policies
vercel.json      Vercel build/deploy config (SPA rewrites)
```

## Local Development

```bash
npm install
npm run dev       # start Vite dev server
npm run build      # production build
npm run preview    # preview production build
```

Requires Supabase project credentials (URL + anon key) configured in `supabase.js` / environment variables.

## Recent Changes

- Re-added the **Smartsheet Enterprise with Premium Support** SKU ($540/user/yr) after it was accidentally dropped in a merge
- Restored multi-year quote support, INR formatting, and other features lost in a bad merge — now consolidated on `main`
- Fixed PDF export layout: moved Terms & Conditions and the signature/acceptance section onto page 2 (previously on page 1), which was causing content to overflow onto a near-blank extra page
- Tightened page 1 vertical spacing so denser quotes (discounts + multi-year investment table) fit on a single printed page without spilling over
- Added RBAC (Admin/HR-Admin/Manager/Contributor) with Supabase RLS-backed quote visibility and a Users & Roles admin view
- Added Customer Account & Contact CRM tables
- Added multi-year contract support (1/2/3 years) with escalation and a year-by-year investment breakdown on the quote and in exports
- Added Indian Rupee (INR) number formatting using the `en-IN` locale
- Rebuilt the app shell with a left sidebar nav and a Home dashboard
- Switched Word export to the `docx` library with browser-compatible `Packer.toBlob()` generation
