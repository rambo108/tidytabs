# 🗂️ TidyTabs

**Drowning in browser tabs?** If you're the kind of person who ends up with 40+ tabs open, the same page loaded three times, and no clue where anything is — this extension is for you.

**TidyTabs** automatically detects and closes duplicate tabs and organizes your remaining tabs into clean, color-coded groups by domain. Works on **Chrome** and **Edge**. No more tab chaos — just click and breathe.

---

## ✨ Features

- **🔁 Auto-close duplicates** — Open a URL that's already in another tab? The stale duplicate is automatically closed. You always keep the most recently accessed one.
- **📁 Group tabs by domain** — One click to organize all your tabs into native tab groups, color-coded by site (e.g., all GitHub tabs grouped together, all Stack Overflow tabs together).
- **📊 Live tab stats** — The popup shows your total open tabs, how many duplicates exist, and how many unique domains you're on — at a glance.
- **🔢 Tab counter badge** — The extension icon shows your total open tab count so you always know where you stand.
- **🛡️ Smart & safe** — Pinned tabs are never touched. Internal browser pages (`edge://`, `chrome://`) are always excluded.
- **🌐 Cross-browser** — Works on both Google Chrome and Microsoft Edge.

<img width="1702" height="951" alt="image" src="https://github.com/user-attachments/assets/dcaf44db-44c7-4e9a-97ba-31b526661831" />

---

## 🚀 Installation

### Option 1 — Download the release (easiest, no build needed)

1. Go to the [**Releases**](../../releases/latest) page
2. Download **tidytabs-vX.X.X.zip**
3. Unzip it to a folder on your computer
4. Load the extension in your browser:

   **Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right)
   - Click **Load unpacked** → select the unzipped folder

   **Edge:**
   - Navigate to `edge://extensions/`
   - Enable **Developer mode** (toggle in the bottom-left)
   - Click **Load unpacked** → select the unzipped folder

That's it! You should see the 🗂️ TidyTabs icon in your toolbar.

### Option 2 — Build from source

If you want to build it yourself or contribute:

**Prerequisites:** [Node.js](https://nodejs.org/) v16+ and Chrome or Edge

```bash
git clone https://github.com/<your-username>/tidytabs.git
cd tidytabs
npm install
npm run build
```

Then load the `dist/` folder using the browser-specific steps above.

> **💡 Tip:** After pulling new changes, run `npm run build` again and click **Reload** (🔄) on the extension card in your browser's extensions page.

---

## 🎮 Usage

| Action | How |
|--------|-----|
| **Close duplicates** | Click the extension icon → **✕ Close Duplicates** |
| **Organize all tabs** | Click the extension icon → **📁 Organize All** (closes duplicates + groups by domain) |
| **Check tab stats** | Click the extension icon — stats are shown instantly |
| **Auto-duplicate removal** | Happens automatically whenever a tab finishes loading |

---

## 🛠️ Development

```bash
npm run dev    # Watch mode — rebuilds on file changes
npm test       # Run unit tests
npm run build  # Production build
```

### How It Works

| Feature | Behavior |
|---------|----------|
| Duplicate detection | Exact normalized URL match |
| Which tab to keep | Most recently accessed |
| Tab grouping | Native `tabGroups` API, color-coded per domain |
| Auto-mode trigger | `tabs.onUpdated` fires when a tab navigates to a new URL |

---

## 📂 Project Structure

```
src/
├── background/service-worker.ts   # Core logic + event listeners
├── popup/                         # Extension popup UI
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
├── types/index.ts                 # TypeScript interfaces
└── utils/
    ├── domain-utils.ts            # URL parsing, domain extraction
    └── tab-utils.ts               # Tab querying, duplicate detection
tests/
├── domain-utils.test.ts
└── tab-utils.test.ts
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
