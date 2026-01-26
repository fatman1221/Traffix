-- 创建数据库
CREATE DATABASE IF NOT EXISTS traffix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE traffix;

-- 创建会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    content TEXT NULL,
    image_url VARCHAR(500) NULL,
    role VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建用户表（公众用户和管理员）
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('public', 'admin') NOT NULL DEFAULT 'public',
    real_name VARCHAR(50) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建举报事件表
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(100) NULL COMMENT '用户选择的事件类型',
    location VARCHAR(255) NULL COMMENT '地点',
    description TEXT NULL COMMENT '用户描述',
    description_text TEXT NULL COMMENT '描述文本',
    contact_phone VARCHAR(20) NULL COMMENT '联系方式',
    status ENUM('pending', 'auto_approved', 'auto_rejected', 'manual_review', 'approved', 'rejected', 'closed') NOT NULL DEFAULT 'pending' COMMENT '状态：待审核、自动通过、自动拒绝、人工复核、已通过、已拒绝、已关闭',
    auto_review_result VARCHAR(50) NULL COMMENT '自动初审结果',
    auto_review_confidence DECIMAL(5,2) NULL COMMENT '自动初审置信度',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建举报图片表（支持多图）
CREATE TABLE IF NOT EXISTS report_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    image_order INT NOT NULL DEFAULT 0 COMMENT '图片顺序',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    INDEX idx_report_id (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建工单表
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    ticket_no VARCHAR(50) NOT NULL UNIQUE COMMENT '工单编号',
    event_type VARCHAR(100) NULL COMMENT '系统识别的事件类型',
    location VARCHAR(255) NULL COMMENT '地点',
    description TEXT NULL COMMENT '事件描述',
    status ENUM('pending', 'assigned', 'processing', 'resolved', 'closed') NOT NULL DEFAULT 'pending' COMMENT '工单状态：待处理、已指派、处理中、已解决、已关闭',
    assigned_to INT NULL COMMENT '指派给的管理员ID',
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium' COMMENT '优先级',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_report_id (report_id),
    INDEX idx_status (status),
    INDEX idx_ticket_no (ticket_no),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建模型识别结果表
CREATE TABLE IF NOT EXISTS model_recognition_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    question TEXT NULL COMMENT '提问内容',
    answer TEXT NULL COMMENT '模型回答',
    event_type_detected VARCHAR(100) NULL COMMENT '检测到的事件类型',
    confidence DECIMAL(5,2) NULL COMMENT '置信度',
    structured_data JSON NULL COMMENT '结构化数据（JSON格式）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    INDEX idx_report_id (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建审核记录表
CREATE TABLE IF NOT EXISTS review_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    reviewer_id INT NOT NULL COMMENT '审核人ID',
    review_type ENUM('auto', 'manual') NOT NULL COMMENT '审核类型：自动、人工',
    review_result ENUM('approved', 'rejected', 'need_review') NOT NULL COMMENT '审核结果',
    review_comment TEXT NULL COMMENT '审核意见',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_report_id (report_id),
    INDEX idx_reviewer_id (reviewer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建处理记录表
CREATE TABLE IF NOT EXISTS ticket_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    operator_id INT NOT NULL COMMENT '操作人ID',
    action VARCHAR(50) NOT NULL COMMENT '操作类型：assign, update_status, add_comment等',
    old_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NULL,
    comment TEXT NULL COMMENT '处理意见',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员账户（密码：admin123，需要在实际使用时修改）
-- 密码哈希使用 bcrypt，这里先留空，需要在应用启动时创建

