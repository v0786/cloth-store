# Cloth Store

Full‑stack clothing e‑commerce + admin management panel built with Next.js.

## Features

- Customer catalog, product details, cart, checkout flow, and order tracking
- Admin dashboard + product catalog (search/sort/pagination)
- Excel import (preview + commit) with row‑level validation + downloadable error logs
- Firestore as primary database
- Google Drive for product images (upload + serve by filename)
- Role-based access control (ADMIN / MANAGER / VIEWER / CUSTOMER)

## Tech Stack

- Frontend/Backend: Next.js (App Router) in `frontend/`
- Auth: NextAuth (Google OAuth + credentials)
- Database: Firestore (Firebase Admin SDK)
- Image storage: Google Drive API

## Local Setup

### 1) Install dependencies

```bash
cd frontend
npm install
```

### 2) Environment variables

Create your environment variables (example keys below). Do not commit secrets.

Required for Google login:

- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET=...`

Required for Firestore (server-side):

Choose one:

- `FIREBASE_SERVICE_ACCOUNT_JSON={...service account json...}`
  - Put the full JSON as a single line string
OR
- `GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccount.json`

Required for Google Drive (service account):

- `GDRIVE_SERVICE_ACCOUNT_JSON={...service account json...}`
- `GDRIVE_FOLDER_ID=...` (recommended)

Optional:

- `ENABLE_CLOUD_IMAGE_VALIDATION=true` (validates image filenames during Excel import)
- `DEFAULT_ADMIN_ENABLED=true` (dev only default admin user)
- `ADMIN_EMAILS=you@example.com` (comma-separated)
- `MANAGER_EMAILS=...`
- `VIEWER_EMAILS=...`

### 3) Run dev server

```bash
cd frontend
npm run dev
```

Open:

- Home: http://localhost:3000
- Admin: http://localhost:3000/admin
- Login: http://localhost:3000/account/login

## Default Admin (Dev only)

If `DEFAULT_ADMIN_ENABLED=true` (and not production), you can login with:

- Username: `admin`
- Password: `admin@123`

## Google Drive Notes

- Enable “Google Drive API” in Google Cloud Console
- Share the target Drive folder with the service account email (`client_email`) as **Editor**
- Image upload endpoint (Admin/Manager):
  - `POST /api/admin/images/upload` (multipart form: `file`, optional `filename`)
- Images served at:
  - `/api/assets/images/<filename>`

## Excel Import

Upload `.xlsx` / `.xls` with mandatory columns:

- `sr.no` (or `product code` / `sku`)
- `product name`
- `product image filename`
- `price`

Admin page:

- http://localhost:3000/admin/import

