# TidyTabs — Store Listing

Copy/paste-ready content for the **Microsoft Edge Add-ons** and
**Chrome Web Store** developer dashboards.

---

## Name

```
TidyTabs — Tab Cleanup & Search
```

## Short description (132 chars max — Edge/Chrome both)

```
Auto-close duplicate tabs, group by domain, and fuzzy-search open tabs & bookmarks. No tracking. No accounts. 100% local.
```

## Detailed description

```
Drowning in browser tabs? TidyTabs keeps your tab strip tidy and your tabs findable — without sending a single byte to any server.

✨ FEATURES

🔁 Auto-close duplicates
Open a URL that's already in another tab? The stale duplicate is closed automatically. You always keep the most recently accessed one.

📁 Group tabs by domain (one click)
Organize all your tabs into native, color-coded tab groups by site — all GitHub tabs together, all Stack Overflow tabs together, etc.

🔍 Fuzzy search across open tabs AND bookmarks
The popup auto-focuses a search box that fuzzy-matches across both your open tabs and your bookmarks. Matched characters are highlighted inline. Click a result to jump to the tab or open the bookmark.

🟦 Active tab highlight
Your currently active tab is called out in the search results with a contrast background and an "● Active" badge.

📍 Find my current tab
Lost your active tab in a sea of tabs? One click expands its tab group, scrolls the browser's tab strip to it, and prefixes the title with 👉 for 5 seconds so it's impossible to miss.

📂 Auto-expand collapsed groups
Switching to a tab inside a collapsed group automatically expands the group so the tab is visible.

📊 Live tab stats
The popup shows your total open tabs, how many duplicates exist, and how many unique domains you're on — at a glance.

🔢 Tab counter badge
The extension icon shows your total open tab count so you always know where you stand.

🛡️ Smart & safe
Pinned tabs are never touched. Internal browser pages (edge://, chrome://) are always excluded.

🔒 PRIVACY

TidyTabs collects ZERO data. No telemetry, no analytics, no servers, no cookies, no accounts. Everything runs locally in your browser. Open source under MIT — audit it yourself: https://github.com/rambo108/tidytabs

Full privacy policy: https://github.com/rambo108/tidytabs/blob/master/PRIVACY.md
```

## Category

- **Edge:** Productivity
- **Chrome:** Workflow & Planning (or Productivity)

## Language

English (United States)

## Screenshots needed

Capture at **1280×800** or **640×400** (Chrome) / **1366×768** (Edge):

1. **Popup with stats** — open the extension on a window with 20+ tabs, several duplicates, multiple domains. Shows the dashboard.
2. **Search in action** — type a partial query (e.g. "git") into the search box, showing fuzzy-highlighted results across open tabs and bookmarks.
3. **Active tab highlight** — search result list with the active tab visibly highlighted with the blue background and `● Active` badge.
4. **Organized tab groups** — browser window after clicking "📁 Organize All", showing color-coded groups in the tab strip.
5. **Find my current tab** — show a tab title prefixed with `👉` in the tab strip after clicking the button.

## Promotional tile (optional but recommended)

- Edge: 300×100 (small), 920×680 (large)
- Chrome: 440×280 (small), 920×680 (large), 1400×560 (marquee)

Use the 🗂️ icon centered on a dark background with the tagline:
**"Tidy up. Find anything. 100% local."**

## Privacy practices form (Chrome Web Store)

| Question | Answer |
|----------|--------|
| Single purpose | Help users manage browser tabs (close duplicates, group by domain, search). |
| Personally identifiable info | No |
| Health info | No |
| Financial / payment info | No |
| Authentication info | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | No |
| Remote code | No |
| Data sold or transferred | No |
| Data used outside single purpose | No |
| Data used to determine creditworthiness | No |

**Justifications for permissions** (Chrome Web Store requires these):

- **`tabs`** — Required to enumerate open tabs to detect duplicates and present them in the search results.
- **`tabGroups`** — Required to create the domain-based color-coded tab groups and to expand collapsed groups when switching to a tab inside them.
- **`bookmarks`** — Required to search the user's bookmarks from the popup.
- **`scripting`** — Required to inject a one-line script that briefly prefixes the active tab's `document.title` with 👉 so the user can locate the tab in the strip ("Find my current tab" feature). The original title is restored within 5 seconds.
- **`host_permissions: <all_urls>`** — Required by the `scripting` API so the title-prefix script can run on any tab the user wants to locate, regardless of site. No page content is read or transmitted.

## Submission checklist

- [ ] `npm run build` (clean dist/ folder)
- [ ] Create release zip from `dist/` (do **NOT** include `node_modules/` or `src/`)
- [ ] Personal Microsoft account (not @microsoft.com) registered as Edge developer
- [ ] Chrome Web Store $5 one-time developer fee paid
- [ ] Privacy policy URL: `https://github.com/rambo108/tidytabs/blob/master/PRIVACY.md`
- [ ] Screenshots prepared at correct dimensions
- [ ] Promo tile (optional) prepared
- [ ] Detailed description pasted
- [ ] Permissions justifications pasted
- [ ] Manifest version bumped if resubmitting
