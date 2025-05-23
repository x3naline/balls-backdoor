# Borneo Anfield Loyalty System API

Sebuah API RESTful yang komprehensif untuk mengelola pemesanan lapangan futsal dengan sistem loyalti terintegrasi, dibangun menggunakan Node.js, Express.js, dan PostgreSQL.

## Features

- Manajemen Pengguna: Registrasi, autentikasi, dan pengelolaan profil
- Manajemen Lapangan: Daftar lapangan futsal dengan pengecekan ketersediaan
- Sistem Booking: Siklus pemesanan lengkap dengan pelacakan status
- Pembayaran: Mendukung berbagai metode pembayaran dengan verifikasi
- Program Loyalty: Sistem pengumpulan dan penukaran poin
- Dashboard Admin: Fungsi lengkap untuk admin dan super admin

## Tech Stack

- Frontend: React (Next.js), Tailwind CSS, Vite
- Backend: Node.js (Express.js v4.18), REST API
- Database: PostgreSQL (via pg-promise & node-pg-migrate)
- Autentikasi: JSON Web Token (JWT)

## Prerequisites

- Node.js (v18.0.0 atau lebih)
- PostgreSQL (v12 atau lebih)
- npm atau yarn

## Instalasi
### 1. Clone the repository ---blm untuk integrasiny ---
`git clone <repository-url> 
cd borneo-anfield-loyalty-system`

### 2. Install dependencies
`npm install`

### 3. Environment Configuration
Buat file `.env` di root direktori:
```
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/borneo_anfield
DATABASE_SSL=false

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Web Push Configuration (for notifications)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@balls.com

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# Loyalty Program Configuration
POINTS_PER_BOOKING=10
POINTS_EXPIRY_DAYS=365
```

### 4. Database Setup
`npm run migrate:up
npm run seed (opsional)`

### 5. Start the server
`npm run dev
npm start (opsional)`

## Skrip yang Tersedia
```
npm run dev          # Jalankan dengan nodemon
npm start            # Jalankan server produksi
npm run migrate:up   # Migrasi database
npm run migrate:down # Rollback
npm run seed         # Isi data awal
npm test             # Jalankan testing
```
