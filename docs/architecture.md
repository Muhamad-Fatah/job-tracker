# Job Application Tracker — Architecture

Monolith **Next.js (App Router) + TypeScript**. End-to-end TS, satu repo. FE kuat → effort belajar terfokus di BE/infra, bukan kebuang di setup dua repo, CORS, dan deploy terpisah.

Trade-off: tidak "pamer" microservice. Untuk KKP ini justru plus — scope terjaga, selesai.

---

## Ringkasan Stack

| Layer | Pilihan | Kenapa |
|---|---|---|
| Framework | Next.js App Router + TS | Monolith, FE kuat |
| API | Server Actions + Route Handler | Type-safe + endpoint eksplisit untuk cron/transisi |
| DB | PostgreSQL | JSONB, numeric presisi (ranking), standar de-facto |
| ORM | Prisma | DX + migration gampang dilaporkan |
| Auth | Auth.js v5 (NextAuth) | Cepat, Google login sekali klik |
| Validasi | Zod | Boundary + guard state machine |
| Drag-drop | dnd-kit (`@dnd-kit/core` + `sortable`) | Modern, maintained |
| Optimistic UI | `useOptimistic` (React 19) | Built-in, no extra dep |
| Chart | Recharts | Analytics (nice-to-have) |
| Scheduler | worker `node-cron` → Route Handler | **Titik infra utama** |
| Deploy | VPS + Docker Compose *atau* Vercel + Neon | Tergantung tujuan |

---

## Detail per Layer

### Framework & API
- **Server Actions** untuk mutasi umum (CRUD lamaran, catatan) — type-safe, minim boilerplate.
- **Route Handler** (`app/api/`) untuk yang perlu jadi API eksplisit: transisi status (validasi ketat) dan endpoint cron/webhook. Lebih gampang dijelaskan di laporan sebagai "endpoint".

### Database — PostgreSQL
Dipilih di atas MySQL karena butuh:
- Tipe numeric presisi tinggi untuk **fractional ranking** (urutan kartu).
- **JSONB** untuk metadata fleksibel (misal snapshot job desc).
- Standar de-facto, bagus di CV.

### ORM — Prisma
DX enak, migration otomatis, schema gampang dimasukkan ke laporan. (Alternatif: Drizzle — lebih SQL-like, learning value tinggi, tapi lebih lambat jadi.)

### Auth — Auth.js v5
Cepat, banyak provider. Ambil ini biar nggak buang waktu bikin auth dari nol. (Alternatif: Lucia — belajar dari dasar, tapi skip karena fokus selesai.)

### Validasi — Zod
Wajib, dipasang di boundary (input Server Action / Route Handler). Sekaligus tempat naruh guard state machine.

### FE
- **Drag-drop:** dnd-kit (jangan react-beautiful-dnd — sudah tidak dimaintain).
- **Optimistic update** saat memindahkan kartu pakai `useOptimistic` (React 19, built-in) — biar mulus tanpa nunggu server, tanpa nambah dependency. TanStack Query hanya jika butuh caching lebih kompleks.
- **Chart:** Recharts untuk analytics.

---

## Bagian Infra (daging KKP)

### Scheduler untuk reminder
**Keterbatasan penting:** Next.js tidak bisa menjalankan cron di dalam prosesnya sendiri. Reminder butuh scheduler yang jalan terus, bukan hanya saat user buka app.

Opsi:
1. **Vercel Cron** — gampang, tapi kurang keliatan infra untuk laporan.
2. **Cron eksternal → Route Handler** (`/api/cron/reminders`) yang diproteksi secret. Sumber cron bisa `node-cron` proses terpisah, cron OS, atau GitHub Actions schedule.
3. **Self-host + worker terpisah** *(disarankan untuk belajar infra)* — Next via Docker + container kecil `node-cron` yang memanggil endpoint reminder. Cerita KKP jadi: "monolith app + worker + scheduler + Postgres, semua di Docker Compose".

### Deploy — dua jalur (pilih sesuai tujuan)
- **Cepat & aman:** Vercel + Neon/Supabase (Postgres managed). Fokus ke fitur.
- **Belajar infra:** VPS (DigitalOcean/Contabo) + Docker Compose (Next + Postgres + worker cron + reverse proxy Caddy/Nginx). Ini yang bikin KKP punya bab infra beneran.

---

## Diagram Komponen (opsi VPS + Docker)

```
                    ┌─────────────────────────────┐
   Browser  ───────▶│  Reverse Proxy (Caddy/Nginx)│
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Next.js (App Router)       │
                    │   - Server Actions (CRUD)    │
                    │   - Route Handlers (API)     │
                    │     /api/cron/reminders      │
                    │   - Auth.js                  │
                    └───────┬──────────────┬───────┘
                            │              │
                   ┌────────▼───┐   ┌──────▼───────────┐
                   │ PostgreSQL │   │  Worker          │
                   │ (Prisma)   │   │  node-cron       │
                   └────────────┘   │  → hit /api/cron │
                                    └──────────────────┘
   Semua container dalam satu docker-compose.
```

---

## Gotcha yang perlu diantisipasi dari awal

- **Urutan kartu dalam kolom:** jangan pakai integer index (update banyak baris tiap reorder). Pakai **fractional/lexorank** (posisi = float/string antara dua kartu) → reorder cukup update 1 baris.
- **Validasi state machine harus di BE**, jangan cuma FE (gampang dibypass). Definisikan transisi valid di backend (Zod + logika transisi).
- **Reminder butuh scheduler yang jalan terus** — tidak bisa hanya saat user buka app. Ini yang memaksa belajar cron/queue beneran.
- **Timezone:** simpan UTC, konversi di FE. Penting untuk reminder & jadwal interview.

---

## Keputusan yang masih terbuka
**Deploy: Vercel (cepat) atau VPS + Docker (belajar infra)?** Ini menentukan bentuk scheduler & arsitektur akhir. Setelah ini: skema database + desain state machine.
