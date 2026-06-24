CREATE TABLE users (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'User primary key',
  openid VARCHAR(100) NOT NULL COMMENT 'WeChat Mini Program unique identifier',
  unionid VARCHAR(100) DEFAULT NULL COMMENT 'WeChat unionid, used for cross-platform identity if available',
  nickname VARCHAR(50) DEFAULT NULL COMMENT 'User nickname',
  avatar_url VARCHAR(500) DEFAULT NULL COMMENT 'User avatar URL',
  phone VARCHAR(20) DEFAULT NULL COMMENT 'Phone number, only available after user authorization',
  role VARCHAR(30) NOT NULL DEFAULT 'USER' COMMENT 'User role: USER, ADMIN',
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' COMMENT 'User status: ACTIVE, DISABLED',
  last_login_at DATETIME DEFAULT NULL COMMENT 'Last login time',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_openid (openid),
  KEY idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User table for WeChat Mini Program login';
