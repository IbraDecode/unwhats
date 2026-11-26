# Kebijakan Privasi UnWhats

Dokumen ini menjelaskan prinsip penanganan data dalam proyek UnWhats open-source. Kebijakan layanan komersial (UnWhats Cloud/Enterprise) akan diterbitkan terpisah dan mengikat secara hukum.

## Data yang diproses

- Data konfigurasi: organisasi, project, environment, API key (hash).
- Data messaging: metadata pesan, status, event, dan referensi media.
- Data operasional: log, metrik, audit record.

## Prinsip

1. **Minimalisasi** — jangan menyimpan payload pesan lengkap di semua tabel log. Pisahkan metadata, payload, media reference, dan audit record.
2. **Isolasi tenant** — organisasi tidak dapat mengakses data organisasi lain.
3. **Retention** — pesan dan audit log memiliki kebijakan retensi yang dikonfigurasi.
4. **Penghapusan dan ekspor** — sediakan mekanisme penghapusan dan ekspor data.
5. **Tanpa pelatihan AI tanpa izin** — pesan pelanggan tidak dipakai untuk melatih model AI tanpa dasar izin dan persetujuan yang sah.
6. **Secret** — kredensial tidak disimpan plaintext dan tidak ditampilkan ulang setelah pembuatan pertama.

## Pelanggan bisnis

Pengiriman pesan bisnis wajib memenuhi opt-in, penggunaan template, dan customer service window sesuai kebijakan provider. UnWhats tidak menyediakan mekanisme untuk menghindari persetujuan tersebut.

## Kontak

Untuk pertanyaan privasi, gunakan kanal kontak resmi proyek.
