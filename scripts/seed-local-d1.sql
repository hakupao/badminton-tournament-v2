INSERT OR IGNORE INTO users (username, password_hash, role)
VALUES ('admin', '$2b$10$HHHlKPY4pkjYSdTamChZt.hF/aGAoNiGif8JpDIWX7bsVBR4/yGKK', 'admin');

UPDATE users
SET password_hash = '$2b$10$HHHlKPY4pkjYSdTamChZt.hF/aGAoNiGif8JpDIWX7bsVBR4/yGKK',
    role = 'admin'
WHERE username = 'admin';
