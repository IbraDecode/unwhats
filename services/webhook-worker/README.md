# Webhook Worker

Direncanakan pada milestone **M5**. Akan mengonsumsi transactional outbox, mengirim webhook dengan HMAC-SHA256, retry eksponensial, dead-letter queue, dan replay yang diaudit.

Status: **belum diimplementasikan**. Kontraknya tersedia di `packages/webhook` dan `packages/event-bus`.
