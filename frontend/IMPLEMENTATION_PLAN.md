# FRONTEND — Complete Implementation Plan (0% → 100%)

> **READ THIS FIRST**: This file contains EVERYTHING needed to build the Frontend. It is the user-facing dashboard for an "AI Product Data Intelligence Platform".

---

## 1. PROJECT CONTEXT

This frontend is a React SPA that connects to a FastAPI backend at `http://localhost:8000/api`. Users upload product CSVs, watch the AI pipeline process them, review/edit enriched products, and export 252-column delivery files.

### What the frontend does:
- Upload CSV files with drag-and-drop
- Display processing dashboard with statistics
- Browse and search products with filtering
- Review enriched products side-by-side (raw vs enriched)
- Edit AI-generated values inline
- View confidence scores, validation results, and evidence
- Export processed products as CSV

---

## 2. TECHNOLOGY STACK

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "vite": "^5.0.0"
}
```

Setup:
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom
npm run dev
```

### Design System
- **No CSS framework** — custom CSS with CSS custom properties
- **Theme**: Dark professional industrial look
- **Primary BG**: `#0f172a` (deep navy)
- **Card BG**: `#1e293b` (slate)
- **Accent**: `#14b8a6` (teal)
- **Confidence colors**: green `#10b981`, yellow `#f59e0b`, orange `#f97316`, red `#ef4444`
- **Font**: Inter (Google Fonts) for body, JetBrains Mono for data
- **Border radius**: 8px for cards, 4px for inputs
- **Transitions**: 200ms ease-in-out on all interactive elements

---

## 3. FOLDER STRUCTURE

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── public/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx                # Router setup
│   ├── index.css              # Global styles + CSS variables
│   ├── api/
│   │   └── client.js          # API client (all backend calls)
│   ├── pages/
│   │   ├── Dashboard.jsx      # Home page with stats
│   │   ├── Upload.jsx         # File upload page
│   │   ├── ProductList.jsx    # Browse/search products
│   │   ├── ProductDetail.jsx  # Full product review page
│   │   ├── BatchReview.jsx    # Review queue for low-confidence items
│   │   └── ExportPage.jsx     # Export configuration and download
│   └── components/
│       ├── Layout.jsx          # App shell: sidebar + header
│       ├── Sidebar.jsx         # Navigation sidebar
│       ├── ProductEditor.jsx   # Inline edit form for product fields
│       ├── AttributeTable.jsx  # Attribute display with LOV badges
│       ├── AttributeRow.jsx    # Single attribute row
│       ├── ConfidenceBadge.jsx # Color-coded confidence indicator
│       ├── ConfidenceBar.jsx   # Horizontal progress bar
│       ├── EvidencePanel.jsx   # Evidence trail for a field
│       ├── ValidationAlert.jsx # Pass/warning/error indicator
│       ├── DescriptionCard.jsx # Display a description with char count
│       ├── StatsCard.jsx       # Dashboard stat card
│       ├── ProgressBar.jsx     # Batch processing progress
│       └── SearchBar.jsx       # Search input with debounce
```

---

## 4. GLOBAL STYLES — `src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* Colors */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --bg-hover: #475569;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border: #334155;
  --accent: #14b8a6;
  --accent-hover: #0d9488;
  
  /* Confidence */
  --conf-high: #10b981;
  --conf-medium: #f59e0b;
  --conf-low: #f97316;
  --conf-very-low: #ef4444;
  
  /* Validation */
  --val-pass: #10b981;
  --val-warning: #f59e0b;
  --val-error: #ef4444;
  
  /* Spacing */
  --radius: 8px;
  --radius-sm: 4px;
  --transition: 200ms ease-in-out;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

.mono { font-family: 'JetBrains Mono', monospace; }

button {
  cursor: pointer;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-family: inherit;
  font-size: 14px;
  transition: all var(--transition);
}

.btn-primary {
  background: var(--accent);
  color: white;
}
.btn-primary:hover { background: var(--accent-hover); }

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.btn-secondary:hover { background: var(--bg-hover); }

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  transition: all var(--transition);
}
.card:hover { border-color: var(--accent); }

input, select {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 8px 12px;
  font-family: inherit;
  font-size: 14px;
}
input:focus, select:focus {
  outline: none;
  border-color: var(--accent);
}

table {
  width: 100%;
  border-collapse: collapse;
}
table th {
  text-align: left;
  padding: 12px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
table td {
  padding: 12px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
table tr:hover { background: var(--bg-tertiary); }
```

---

## 5. API CLIENT — `src/api/client.js`

```javascript
const BASE_URL = 'http://localhost:8000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Health
  health: () => request('/health'),

  // Upload
  uploadFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE_URL}/upload`, { method: 'POST', body: form }).then(r => r.json());
  },

  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products?${qs}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  updateProduct: (id, updates) => request(`/products/${id}`, {
    method: 'PATCH', body: JSON.stringify(updates)
  }),
  getStats: () => request('/products/stats'),

  // Processing
  processProduct: (id) => request(`/process/${id}`, { method: 'POST' }),
  processBatch: (batchId) => request(`/process/batch/${batchId}`, { method: 'POST' }),
  getBatchStatus: (batchId) => request(`/process/status/${batchId}`),

  // Export
  exportProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/export?${qs}`);
  },
};
```

---

## 6. APP SHELL — Routing & Layout

### `src/main.jsx`
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter><App /></BrowserRouter>
);
```

### `src/App.jsx`
```jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import BatchReview from './pages/BatchReview';
import ExportPage from './pages/ExportPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/review" element={<BatchReview />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </Layout>
  );
}
```

### `src/components/Layout.jsx`
```jsx
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
```

### `src/components/Sidebar.jsx`
```jsx
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/upload', label: 'Upload', icon: '📤' },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/review', label: 'Review Queue', icon: '👁️' },
  { to: '/export', label: 'Export', icon: '📥' },
];

export default function Sidebar() {
  return (
    <aside style={{
      width: 240, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      padding: '20px 0', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>🧠 ProductIQ</h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>AI Product Intelligence</p>
      </div>
      <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            borderRadius: 6, textDecoration: 'none', fontSize: 14,
            background: isActive ? 'var(--bg-tertiary)' : 'transparent',
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
          })}>
            <span>{l.icon}</span> {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

---

## 7. PAGES — Detailed Specification

### Page 1: `Dashboard.jsx`

**Layout**: 2-row grid
- Row 1: 5 stat cards (Total, Pending, Completed, Needs Review, Errors)
- Row 2: Confidence distribution bar chart + recent activity

**Stat card specification**:
- Shows a number (large, bold, mono font)
- Shows a label below (small, muted)
- Shows an icon/emoji left-aligned
- Background: `var(--bg-secondary)`
- The "Needs Review" card should have an orange left-border

**API call**: `api.getStats()` on mount

**Buttons**:
- "Upload New File" → navigates to /upload
- "Process All Pending" → calls `api.processBatch()`
- "Export Completed" → navigates to /export

---

### Page 2: `Upload.jsx`

**Layout**: Centered card with:
1. **Drag-and-drop zone**: Large dashed-border area (300px tall)
   - Text: "Drop CSV file here or click to browse"
   - Accept: `.csv` files only
   - On hover: border turns teal, background lightens
2. **File info**: After file selected, show filename, size, estimated rows
3. **Preview table**: Show first 5 rows of parsed CSV data
4. **Upload button**: "Upload & Import" — calls `api.uploadFile()`
5. **After upload**: Show success message with batch_id, "Start Processing" button

**State machine**:
```
idle → file_selected → uploading → uploaded → processing
```

---

### Page 3: `ProductList.jsx`

**Layout**: Filter sidebar (left, 240px) + Product table (right)

**Filter sidebar**:
- **Search**: Text input with magnifying glass icon, debounced 300ms
- **Status filter**: Dropdown — All, Pending, Completed, Error, Needs Review
- **Confidence filter**: Dropdown — All, High, Medium, Low, Very Low
- **Category filter**: Dropdown — populated from unique classpaths
- **Clear filters** button

**Product table columns**:
| Column | Width | Content |
|--------|-------|---------|
| MPN | 120px | Monospace, clickable link |
| Description | flex | Part_Desc (truncated 60 chars) |
| Manufacturer | 150px | Resolved manufacturer name |
| Brand | 120px | Resolved brand name |
| Category | 150px | Fine category |
| Confidence | 80px | ConfidenceBadge component |
| Status | 100px | Status pill (green/yellow/red) |

**Clicking a row** → navigates to `/products/{product_id}`

**Pagination**: Bottom of table — Previous/Next buttons + "Page X of Y"

---

### Page 4: `ProductDetail.jsx` — THE MOST IMPORTANT PAGE

**Layout**: Two-column layout

**Left column (40% width): RAW INPUT**
- Card titled "Raw Input"
- Shows all 6 input fields in a key-value list:
  - Mfg Part Num: `{value}` (mono font)
  - Part Description: `{value}`
  - E1 Brand: `{value}` (red if placeholder)
  - DIB Brand: `{value}` (red if placeholder)
  - Part Manuf: `{value}`

**Right column (60% width): ENRICHED OUTPUT**
- **Identity Card**:
  - Manufacturer: `{resolved}` with ConfidenceBadge
  - Brand: `{resolved}` with ConfidenceBadge
  - Resolution method badge (e.g., "fuzzy_match")
  
- **Classification Card**:
  - Classpath displayed as breadcrumb: Dept > Class > Fine
  - ConfidenceBadge for classification

- **Descriptions Card**:
  - Each description in a DescriptionCard component:
    - Label (e.g., "Invoice Description")
    - The text
    - Character count indicator (green if valid, red if over limit)
    - Edit button (pencil icon)

- **Attributes Table**:
  - Table with columns: Attribute | Value | UOM | LOV ✓ | Confidence
  - LOV column shows ✓ (green) or ✗ (red) or — (gray)
  - Each row is editable inline on click

- **Validation Panel**:
  - List of ValidationAlert components
  - Grouped by severity: errors first, warnings, then passes

- **Overall Confidence**:
  - Large circular gauge showing overall score (0-100%)
  - Breakdown of 7 signals as horizontal bars
  - "Needs Human Review" flag with reasons

**Action buttons (top right)**:
- ✓ Approve All (green)
- ✎ Edit (blue) 
- ↻ Reprocess (gray)
- ✗ Reject (red)

---

### Page 5: `BatchReview.jsx`

**Layout**: Single-column list of products needing review

- Filter: products where `needs_human_review == true`
- Each item shows:
  - MPN + abbreviated description
  - Overall confidence badge
  - Review reasons as tags
  - Quick approve/reject buttons
  - Expand arrow → shows inline ProductDetail preview

---

### Page 6: `ExportPage.jsx`

**Layout**: Export configuration card

- **Summary**: X products ready, Y need review, Z errors
- **Batch selector**: Dropdown to pick batch or "All"
- **Status filter**: Only completed, or include reviewed
- **Preview**: First 3 rows of export data in a horizontal-scroll table
- **Download button**: "Download 252-Column CSV" (teal, large)
  - Calls `api.exportProducts()` and triggers browser download

---

## 8. KEY COMPONENTS

### `ConfidenceBadge.jsx`
```jsx
export default function ConfidenceBadge({ score, level }) {
  const colors = {
    high: 'var(--conf-high)', medium: 'var(--conf-medium)',
    low: 'var(--conf-low)', very_low: 'var(--conf-very-low)'
  };
  return (
    <span className="mono" style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 12, fontWeight: 600,
      background: `${colors[level]}20`, color: colors[level],
      border: `1px solid ${colors[level]}40`
    }}>
      {Math.round((score || 0) * 100)}%
    </span>
  );
}
```

### `ValidationAlert.jsx`
```jsx
export default function ValidationAlert({ validation }) {
  const icons = { pass: '✓', warning: '⚠', error: '✗' };
  const colors = { pass: 'var(--val-pass)', warning: 'var(--val-warning)', error: 'var(--val-error)' };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
      borderLeft: `3px solid ${colors[validation.status]}`,
      background: 'var(--bg-tertiary)', borderRadius: '0 4px 4px 0', marginBottom: 4, fontSize: 13
    }}>
      <span style={{ color: colors[validation.status] }}>{icons[validation.status]}</span>
      <span style={{ color: 'var(--text-muted)', minWidth: 120 }}>{validation.field}</span>
      <span>{validation.message}</span>
    </div>
  );
}
```

### `DescriptionCard.jsx`
```jsx
import { useState } from 'react';

export default function DescriptionCard({ label, value, maxChars, minChars }) {
  const [editing, setEditing] = useState(false);
  const len = (value || '').length;
  const isValid = (!maxChars || len <= maxChars) && (!minChars || len >= minChars);
  
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, color: isValid ? 'var(--conf-high)' : 'var(--conf-very-low)' }}>
          {len}{maxChars ? `/${maxChars}` : ''}
        </span>
      </div>
      <p className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {value || '—'}
      </p>
    </div>
  );
}
```

### `StatsCard.jsx`
```jsx
export default function StatsCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: color || 'var(--text-primary)', margin: '8px 0' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}
```

---

## 9. BUILD ORDER

| Step | Files | Test |
|------|-------|------|
| 1 | `index.css`, `main.jsx`, `App.jsx`, `Layout.jsx`, `Sidebar.jsx` | App shell renders with navigation |
| 2 | `api/client.js`, `Dashboard.jsx`, `StatsCard.jsx` | Dashboard shows stats from API |
| 3 | `Upload.jsx` | Can upload a CSV file |
| 4 | `ProductList.jsx`, `ConfidenceBadge.jsx`, `SearchBar.jsx` | Can browse products with filters |
| 5 | `ProductDetail.jsx`, `DescriptionCard.jsx`, `AttributeTable.jsx`, `ValidationAlert.jsx`, `EvidencePanel.jsx` | Full product review page works |
| 6 | `BatchReview.jsx`, `ExportPage.jsx` | Review queue and export work |
| 7 | Polish: animations, responsive, loading states, error handling | Demo-ready |

**END OF FRONTEND PLAN**
