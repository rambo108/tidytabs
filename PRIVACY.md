# TidyTabs — Privacy Policy

_Last updated: 2026-05-01_

## Summary

**TidyTabs does not collect, store, transmit, or share any of your data.**
Everything happens locally in your browser. There are no servers, no
analytics, no telemetry, no third-party services.

## What data the extension touches

To do its job, TidyTabs reads the following information **from your local
browser only**, and only while the extension is running:

| Data | Why it's needed | Where it goes |
|------|-----------------|---------------|
| Open tab URLs and titles | Detect duplicates, group by domain, power the search box | Stays in your browser. Never sent anywhere. |
| Bookmark titles, URLs, and folders | Power the search box | Stays in your browser. Never sent anywhere. |
| Tab group names and collapsed state | Auto-expand the group of a tab you switch to | Stays in your browser. Never sent anywhere. |
| The active tab's `document.title` | Briefly prefix it with `👉` so you can locate the tab in the strip when you click "Find my current tab" | Modified locally on the tab itself. The original title is restored within 5 seconds. |

## What TidyTabs does NOT do

- ❌ Does not record your browsing history
- ❌ Does not send any data to any server (there is no backend at all)
- ❌ Does not use cookies, web beacons, or analytics SDKs
- ❌ Does not sell or share data with third parties
- ❌ Does not include any advertising
- ❌ Does not access page content (only the tab/bookmark metadata above)
- ❌ Does not modify pages other than briefly setting `document.title` for the "Find my current tab" marker

## Permissions explained

| Permission | Why TidyTabs requests it |
|------------|--------------------------|
| `tabs` | Enumerate open tabs to detect duplicates and search them |
| `tabGroups` | Create, color, expand, and collapse domain-based tab groups |
| `bookmarks` | Search your bookmarks from the popup |
| `scripting` | Inject a tiny script that prefixes the active tab's `document.title` with `👉` so you can spot it in the tab strip (used by "Find my current tab"). The original title is automatically restored. |
| `<all_urls>` (host permission) | Required by `scripting` so the title prefix can be applied to any tab regardless of site. No page content is read. |

## Open source

TidyTabs is open source. You can audit every line of code at:
**https://github.com/rambo108/tidytabs**

## Contact

Questions? Open an issue at
**https://github.com/rambo108/tidytabs/issues**
