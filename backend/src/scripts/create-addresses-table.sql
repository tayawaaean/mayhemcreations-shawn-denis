-- Create addresses table for managing warehouse and business addresses
CREATE TABLE IF NOT EXISTS addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Display name for the address',
    type ENUM('origin', 'return', 'warehouse') NOT NULL COMMENT 'Type of address',
    is_default BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether this is the default address for its type',
    contact_name VARCHAR(100) NOT NULL COMMENT 'Contact person name',
    company_name VARCHAR(100) NULL COMMENT 'Company or business name',
    phone VARCHAR(20) NULL COMMENT 'Phone number',
    email VARCHAR(100) NULL COMMENT 'Email address',
    address_line1 VARCHAR(100) NOT NULL COMMENT 'Primary address line',
    address_line2 VARCHAR(100) NULL COMMENT 'Secondary address line (apartment, suite, etc.)',
    city VARCHAR(50) NOT NULL COMMENT 'City',
    state VARCHAR(50) NOT NULL COMMENT 'State or province',
    postal_code VARCHAR(20) NOT NULL COMMENT 'Postal or ZIP code',
    country VARCHAR(2) NOT NULL DEFAULT 'US' COMMENT 'Country code (ISO 3166-1 alpha-2)',
    residential_indicator ENUM('yes', 'no', 'unknown') NOT NULL DEFAULT 'no' COMMENT 'Whether this is a residential address',
    notes TEXT NULL COMMENT 'Additional notes about the address',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type_default (type, is_default),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
