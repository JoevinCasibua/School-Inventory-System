# School Supply Inventory System (Static Version)

A pure **HTML + CSS + JavaScript** inventory system with JSON-based data and `localStorage` persistence. No PHP, no MySQL, no server required.

## Features

- Admin Login (client-side auth using `sessionStorage`)
- Dashboard with summary cards + Chart.js category chart
- Product Management (Add, Edit, Delete, View) — all CRUD in JS
- Live search and category filter
- Low stock alerts (highlights items with quantity < 5)
- Responsive sidebar layout, modal forms
- Data persisted in `localStorage` so changes survive page reloads

## How to Run

**Option 1 — Open directly:**
Just double-click `index.html`. Works in any modern browser.

**Option 2 — Using a local server (recommended):**
```
cd inventory-static
# Python
python -m http.server 8000
# OR Node
npx serve .
```
Then open `http://localhost:8000`.

## Login

- Username: `admin`
- Password: `admin123`

(Defined in [assets/js/app.js](assets/js/app.js) under `DEFAULT_DATA.users`.)

## Data

- Initial seed: [data/products.json](data/products.json) (reference only — the live data lives in `localStorage`)
- On first run, default data is loaded into `localStorage` under the key `school_inventory_data`.
- To reset, open browser DevTools → Application → Local Storage → delete the key, or run:
  ```js
  Store.resetData();
  ```

## File Structure

```
inventory-static/
├── index.html             -> login page
├── dashboard.html         -> dashboard with cards + chart
├── products.html          -> products table + search + modals
├── data/
│   └── products.json      -> initial seed (reference)
└── assets/
    ├── css/style.css      -> all styling
    └── js/app.js          -> auth, storage, UI helpers
```

## Tech Stack

- HTML5
- CSS3 (Flexbox + Grid, responsive)
- JavaScript (ES6+, no frameworks)
- Chart.js (loaded from CDN)
- localStorage for persistence
