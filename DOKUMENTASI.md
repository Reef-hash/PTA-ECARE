# Dokumentasi Projek E-CARE (Portal CMS PTA)

## 1. Pengenalan
**E-CARE (Portal CMS PTA)** adalah sebuah sistem pengurusan aduan pelanggan secara berpusat dan teratur yang dibangunkan khusus untuk menguruskan data pembaikan servis barangan elektrik. Sistem ini bertindak sebagai jambatan digital di antara pelanggan, juruteknik, dan pihak pengurusan (admin) untuk memastikan setiap proses pembaikan direkod, dipantau, dan diselesaikan dengan cekap.

## 2. Objektif Sistem
- **Digitalisasi Proses:** Menggantikan sistem manual atau berasaskan kertas kepada platform digital yang sistematik dan mudah diakses di mana-mana sahaja.
- **Pemantauan Masa Nyata (Real-time Tracking):** Memudahkan pelanggan dan pihak pengurusan menyemak status pembaikan barangan elektrik secara masa nyata.
- **Pengurusan Data Berpusat:** Menyimpan pangkalan data pelanggan, maklumat barangan, invois, dan sejarah pembaikan secara selamat dan berpusat.
- **Meningkatkan Kecekapan:** Mengurangkan kelewatan (delay) dalam komunikasi antara admin dan juruteknik dengan adanya sistem agihan tugas (job assignment) secara automatik.

## 3. Pengguna Sistem (User Roles)
Sistem ini terbahagi kepada beberapa peranan utama dengan tahap akses yang berbeza:

### A. Pelanggan (Customer)
- Boleh mendaftar akaun baharu dan log masuk.
- Boleh mencipta aduan baharu dengan memuat naik butiran kerosakan, gambar, dan resit/kad jaminan (warranty).
- Menjejaki status aduan (Track Repair) dari mula sehingga selesai.
- Menerima notifikasi e-mel bagi setiap kemaskini status.

### B. Juruteknik (Technician) & Ketua Juruteknik (Main Technician)
- Mempunyai papan pemuka (dashboard) untuk melihat tugasan pembaikan yang telah diagihkan kepada mereka.
- Memperbaharui status kerosakan *(contoh: Pending ➔ In Process ➔ Closed)*.
- Memasukkan nota teknikal (remarks) atau maklumat alat ganti (spare parts) yang diperlukan.
- **Ketua Juruteknik** mempunyai kelebihan tambahan untuk melihat statistik keseluruhan juruteknik dan memanjangkan aduan (forward) kepada juruteknik lain jika perlu.

### C. Pentadbir (Admin / Pengurusan)
- Memantau keseluruhan operasi menerusi *Dashboard Analytics* (jumlah aduan selesai, tertunggak, dsb).
- Menambah, mengemaskini, atau menyekat pengguna (pelanggan & juruteknik).
- Mengagihkan aduan pelanggan kepada juruteknik yang berkelayakan.
- Menetapkan tetapan sistem seperti Kategori Barangan, Subkategori, dan Jenama (Brands).
- Menghantar notifikasi atau menetapkan semula (reset) kata laluan untuk staf atau pengguna.

## 4. Kitaran Hayat Pembaikan (Repair Lifecycle)
Setiap barangan elektrik yang dihantar untuk dibaiki akan melalui status-status berikut:
1. **Pending (Menunggu):** Aduan baharu didaftarkan dan belum ditugaskan kepada mana-mana juruteknik.
2. **In Process (Sedang Diproses):** Barangan sedang diperiksa atau dibaiki oleh juruteknik.
3. **Incomplete (Tidak Lengkap/Tangguh):** Pembaikan tergendala (mungkin kerana menunggu alat ganti atau kerosakan kritikal).
4. **Ready Pickup:** Barangan telah siap dibaiki dan menunggu pelanggan untuk mengambilnya.
5. **Closed (Selesai):** Proses pembaikan selesai dan barang telah dikembalikan kepada pelanggan.
6. **Cancelled (Dibatalkan):** Aduan ditolak atau dibatalkan.

## 5. Ciri-ciri Utama (Key Features)
- **Modul Pembaikan Berstatus:** Logik perniagaan (business logic) yang ketat untuk mengelakkan percanggahan status pembaikan.
- **Sistem Notifikasi E-mel Automatik:** Menggunakan perkhidmatan *Resend* (atau SMTP) untuk menghantar notifikasi seperti pengesahan pendaftaran, penukaran kata laluan, dan pemberitahuan siap baiki.
- **Pengurusan Waranti:** Memisahkan aduan jenis *Under Warranty* (Dalam Jaminan) dan *Over Warranty* (Luar Jaminan).
- **Pengurusan Fail Selamat:** Membolehkan pelanggan memuat naik gambar resit dan kerosakan yang akan disimpan dengan selamat di server.

## 6. Teknologi Terlibat (Technology Stack)
- **Frontend:** React.js (dengan Vite & TypeScript), dilengkapkan dengan rekaan UI moden menggunakan Tailwind CSS.
- **Backend:** Node.js & Express.js (menyediakan API yang pantas dan selamat menggunakan pengesahan JWT).
- **Pangkalan Data:** MySQL (pangkalan data hubungan untuk integriti data tinggi).
- **Infrastruktur/Hosting:** Hostinger (VPS), PM2 (Process Manager untuk Node.js), Nginx, dan GitHub untuk kawalan versi kod.
