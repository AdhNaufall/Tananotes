# Tananotes

Tananotes adalah aplikasi catatan pribadi berbasis Next.js dengan editor rich text, kategori berwarna, autosave draft, version history, pin note, export dokumen, dan dashboard produktivitas (notes, todos, schedules, stats).

## 1. Product Overview

### Nilai Utama
- Menulis catatan cepat dengan editor visual yang kaya format.
- Menjaga data tetap aman lewat draft autosave dan versioning.
- Mengorganisasi catatan dengan kategori, pencarian, filter, dan pin.
- Menyediakan utilitas harian: todo list, schedule, dan statistik.

### Target Use Case
- Personal knowledge management.
- Catatan kuliah/kerja harian.
- Draft konten dan dokumentasi ringan.

## 2. Fitur Saat Ini

### Notes Core
- Create, read, update, delete note.
- Slug otomatis unik per judul.
- Pin/unpin note.
- Kategori dengan warna.
- Full-text search (MongoDB text index) + fallback regex search.
- Highlight hasil pencarian di judul/kategori/snippet.

### Editing Experience
- Professional rich text editor (heading, bold, italic, underline, strike, align, list, link, image, quote, code, HR).
- Auto bullet list saat mengetik `-` lalu `spasi`.
- Tab behavior ala editor dokumen:
	- Dalam list: indent/outdent.
	- Di teks biasa: paragraph indent.

### Draft & Versioning
- Draft autosave per scope (new note / edit note).
- Restore draft saat halaman dibuka lagi.
- Version history (menyimpan snapshot sebelum perubahan penting).
- Restore note dari versi sebelumnya.

### Media & Export
- Upload image via Vercel Blob untuk production, dengan fallback `public/uploads` saat development lokal.
- Export note ke PDF, Markdown, dan TXT.

### Productivity Modules
- Todo CRUD.
- Schedule CRUD.
- Stats dashboard (jumlah note, kategori, kata, pinned, aktivitas).

### Authentication & Access Control
- Register, login, logout, dan session check (`/api/auth/me`).
- Forgot password + reset password flow (`/forgot-password`, `/reset-password`).
- Session berbasis JWT di HttpOnly cookie (`tananotes_session`).
- Semua endpoint data utama diproteksi dan di-scope per user (`ownerId`).
- Guard halaman dan API memakai `proxy.ts` (konvensi Next.js 16).

Catatan reset password:
- Di localhost/dev, endpoint forgot password mengembalikan `debugResetUrl` agar flow bisa dites tanpa SMTP.
- Untuk production, set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` agar link reset benar-benar terkirim via email.
- Endpoint forgot password dibatasi rate limit sederhana per IP dan per email untuk mengurangi abuse.

## 3. Arsitektur Singkat

- Framework: Next.js (App Router) + React + TypeScript.
- Styling: Tailwind CSS.
- Database: MongoDB + Mongoose.
- Data access: API Routes di `app/api`.
- Rendering: kombinasi server component dan client component.

## 4. Struktur Folder Inti

```text
app/
	api/
		notes/
		drafts/
		categories/
		todos/
		schedules/
		stats/
		upload/
	notes/
	categories/
	category/
	schedule/
components/
lib/
models/
public/uploads/
```

## 5. Setup Development

### Prasyarat
- Node.js 18+ (disarankan 20+).
- MongoDB instance aktif (local/cloud).

### Instalasi
```bash
npm install
```

### Environment Variable
Buat file `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
NEXT_PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=replace_with_a_long_random_secret
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Tananotes <no-reply@yourdomain.com>
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx
```

Catatan:
- `MONGODB_URI` wajib ada, aplikasi akan throw error jika kosong.
- `NEXT_PUBLIC_BASE_URL` dipakai di beberapa server-side fetch internal.
- `JWT_SECRET` wajib untuk sign/verify session login.
- `RESEND_API_KEY` dan `RESEND_FROM_EMAIL` diperlukan untuk pengiriman email reset password.
- `BLOB_READ_WRITE_TOKEN` diperlukan untuk upload gambar di Vercel.

### Menjalankan Aplikasi
```bash
npm run dev
```

Open `http://localhost:3000`.

## 6. NPM Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # run production server
npm run lint    # lint check
npm run test:auth-smoke  # auth flow smoke test (server harus sudah jalan)
npm run test:notes-smoke # notes CRUD smoke test (server harus sudah jalan)
```

Default target smoke test:

```bash
BASE_URL=http://localhost:3000 npm run test:auth-smoke
BASE_URL=http://localhost:3000 npm run test:notes-smoke
```

## 7. API Ringkas

### Notes
- `GET /api/notes`
	- Query opsional: `search`, `category`, `pinned`, `dateFrom`, `dateTo`, `sortBy`.
- `POST /api/notes`
- `PUT /api/notes`
- `DELETE /api/notes?id=<noteId>`
- `GET /api/notes/[slug]`
- `PATCH /api/notes/pin`
- `GET /api/notes/[slug]/versions`
- `POST /api/notes/[slug]/versions` (restore version)

### Drafts
- `GET /api/drafts?scope=<scope>`
- `POST /api/drafts`
- `DELETE /api/drafts?scope=<scope>`

### Other Modules
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET/POST /api/categories`
- `GET/POST/PATCH/DELETE /api/todos`
- `GET/POST/DELETE /api/schedules`
- `GET /api/stats`
- `POST /api/upload`

## 8. Data Model Highlights

### Note
- `title`, `category`, `content`, `slug`, `color`, `isPinned`, `images`, `isDeleted`, `deletedAt`, timestamps.
- Text index untuk pencarian pada `title`, `category`, `content`.

### NoteVersion
- Snapshot isi note untuk rollback perubahan.

### NoteDraft
- Draft per scope untuk autosave.

### Todo / Schedule
- Entitas terpisah untuk produktivitas harian.

## 9. Current Limitations

- Trash endpoint belum lengkap (soft delete model sudah ada, tetapi API trash belum final).
- Belum ada test automation komprehensif (unit/integration/e2e) meskipun smoke test API utama sudah tersedia.
- Belum ada monitoring/observability (misal Sentry).

## 10. Rekomendasi Hardening (Next Phase)

- Tambahkan revocation strategy untuk JWT (misalnya denylist/rotating token) jika butuh hard logout lintas device.
- Konsistenkan soft delete dan restore flow via trash API.
- Tambahkan test automation minimal:
	- API smoke test untuk auth, notes, drafts, upload.
	- E2E smoke untuk create-edit-export.
- Perluas CI workflow yang sudah ada dengan test level lebih tinggi (integration/e2e) dan quality gate tambahan.
- Tambahkan monitoring error/performance.

## 12. CI / Automation

- Workflow: `.github/workflows/ci.yml`.
- Trigger: `push` (main/master) dan `pull_request`.
- Pipeline saat ini:
	- Install dependencies (`npm ci`)
	- Lint (`npm run lint`)
	- Build (`npm run build`)
	- Start app production mode
	- Run auth smoke test (`npm run test:auth-smoke`)
	- Run notes smoke test (`npm run test:notes-smoke`)
- CI menjalankan MongoDB service container (`mongo:7`) untuk kebutuhan API dan auth flow.

## 11. Deployment Checklist

- Set `MONGODB_URI`, `NEXT_PUBLIC_BASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, dan `RESEND_FROM_EMAIL` di environment production.
- Jalankan:

```bash
npm run build
npm run start
```

- Untuk verifikasi auth cepat setelah deploy, jalankan smoke test:

```bash
npm run test:auth-smoke
npm run test:notes-smoke
```

- Pastikan `BLOB_READ_WRITE_TOKEN` tersedia di Vercel untuk upload gambar.
- Verifikasi API utama: auth, notes, drafts, upload, versions.

## 13. Tech Stack

- Next.js 16
- React 19
- TypeScript
- MongoDB + Mongoose
- Tailwind CSS
- Lucide React
- html2canvas + jsPDF

## 14. Lisensi

Internal project / private repository.
