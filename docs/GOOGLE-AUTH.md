# Flow Login "Sign in with Google" — Next.js + Auth.js v5 + Prisma + Postgres

Stack: Next.js (App Router), Auth.js v5 (NextAuth), Prisma, PostgreSQL.
Session strategy: **database** (bisa dipakai karena Google-only, tanpa CredentialsProvider).

## Dua fase

Flow terbagi jadi dua fase yang berbeda:

- **Fase login (langkah 1–6):** sekali jalan waktu user masuk.
- **Fase pakai (langkah 7):** terjadi tiap request setelah login.

## Fase login

### 1. User klik "Sign in with Google"
Server action `signIn("google")` jalan. Auth.js redirect browser ke halaman consent Google, membawa `client_id`, scope, dan redirect URI (`/api/auth/callback/google`).

### 2. User pilih akun & setujui di Google
Google verifikasi identitas, lalu redirect balik ke aplikasi.

### 3. Redirect balik + authorization code
Google redirect ke `/api/auth/callback/google` dengan `code` (authorization code) di URL.

### 4. Tukar code jadi token (server ke server)
Route handler menangkap callback. Auth.js kirim `code` + `client_secret` ke server Google, dapat `access_token` + `id_token` (berisi profil: email, nama, foto).
Langkah ini di server — `client_secret` tidak pernah terlihat di browser.

### 5. Simpan ke database (Prisma adapter)
- Cek tabel `User` by email. Belum ada → buat row `User` baru. Sudah ada → pakai yang lama.
- Buat / update row `Account` (link ke provider Google + token).
- Karena `strategy: "database"`, buat row `Session` baru (sessionToken + expires).

### 6. Set cookie
Auth.js kirim cookie `authjs.session-token` ke browser (httpOnly, isinya hanya sessionToken — bukan data user). Browser redirect ke `/dashboard`.

## Fase pakai

### 7. Request berikutnya (akses halaman terproteksi)
Browser membawa cookie otomatis. Dua hal terjadi:
- **Middleware** (`authorized` callback) cek: path `/dashboard`? user login? Kalau belum → redirect `/login`.
- **`auth()`** di server component ambil sessionToken dari cookie → query tabel `Session` → dapat user → render halaman.

### Logout
`signOut()` → hapus row `Session` di DB + hapus cookie → redirect `/login`.

## Catatan strategi session

Karena pakai `strategy: "database"`:
- **Untung:** bisa hapus row `Session` untuk force-logout user dari sisi server.
- **Biaya:** langkah 7 selalu query DB (satu row lookup) tiap request yang butuh session.

Bandingkan dengan JWT: tidak ada row untuk dihapus, session valid sampai expired, tapi tidak ada query DB.

## Ringkasan alur

```
1. User klik tombol      signIn("google")
2. Consent Google        pilih akun, setujui
3. Redirect + code       /api/auth/callback/google
4. Tukar code -> token   server ke server (secret aman)
5. Simpan ke DB          User, Account, Session
6. Set cookie            httpOnly session token
7. Akses /dashboard      middleware cek + auth() query Session
```
