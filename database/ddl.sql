CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE balances (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    service_code VARCHAR(100) NOT NULL UNIQUE,
    service_name VARCHAR(255) NOT NULL,
    service_icon TEXT,
    service_tariff BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    transaction_type VARCHAR(50) NOT NULL,
    service_code VARCHAR(100),
    service_name VARCHAR(255),
    total_amount BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO services (service_code, service_name, service_icon, service_tariff) VALUES
('PAJAK', 'Pajak PBB', 'https://example.com/pajak.png', 40000),
('PLN', 'Listrik', 'https://example.com/pln.png', 10000),
('PDAM', 'PDAM Berlangganan', 'https://example.com/pdam.png', 40000),
('PULSA', 'Pulsa', 'https://example.com/pulsa.png', 40000),
('PGN', 'PGN Berlangganan', 'https://example.com/pgn.png', 50000),
('MUSIK', 'Musik Berlangganan', 'https://example.com/musik.png', 50000),
('TV', 'TV Berlangganan', 'https://example.com/tv.png', 50000),
('PAKET_DATA', 'Paket Data', 'https://example.com/data.png', 50000),
('VOUCHER_GAME', 'Voucher Game', 'https://example.com/game.png', 100000),
('VOUCHER_MAKANAN', 'Voucher Makanan', 'https://example.com/makanan.png', 100000),
('QURBAN', 'Qurban', 'https://example.com/qurban.png', 200000),
('ZAKAT', 'Zakat', 'https://example.com/zakat.png', 300000);