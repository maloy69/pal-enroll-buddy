# Perbaikan Penempatan Jurusan Sesuai Kuota

## Perubahan
- Jadikan proses seleksi otomatis sebagai satu-satunya cara menetapkan hasil massal, dengan urutan pilihan pertama lalu pilihan kedua.
- Pastikan pendaftar berstatus diterima selalu memiliki jurusan hasil seleksi; data lama yang belum memilikinya akan diproses ulang.
- Cegah tombol keputusan manual menerima pendaftar jika kuota jurusan sudah penuh, dan arahkan ke pilihan kedua yang masih tersedia bila memenuhi syarat.
- Perbarui ringkasan agar jumlah kursi terisi dihitung dari jurusan hasil seleksi, bukan perkiraan pilihan pertama.

## Pemeriksaan
- Uji kasus dua pendaftar memilih Produksi Film dengan kuota 1: satu diterima di Produksi Film dan satu dialihkan ke pilihan kedua.
- Pastikan jumlah terisi tidak pernah melebihi kuota dan grafik/ringkasan menampilkan jurusan hasil yang benar.

## Teknis
- Pusatkan aturan penempatan di fungsi database agar perubahan beberapa pendaftar berlangsung konsisten.
- Sesuaikan halaman Hasil per Jurusan supaya tidak bisa membuat status `Diterima` tanpa `jurusan diterima`.
