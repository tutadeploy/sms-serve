-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `sms_serve` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 确保root用户可以从任何IP访问，设置密码为root123
ALTER USER 'root'@'%' IDENTIFIED BY 'root123';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;

USE sms_serve;

-- 删除现有数据（按照外键依赖顺序）
DROP TABLE IF EXISTS user_tenant_roles;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS sms_received_messages;
DROP TABLE IF EXISTS email_received_messages;
DROP TABLE IF EXISTS email_messages;
DROP TABLE IF EXISTS email_notification_batches;
DROP TABLE IF EXISTS sms_messages;
DROP TABLE IF EXISTS sms_dispatch_batches;
DROP TABLE IF EXISTS sms_batch_buka_detail;
DROP TABLE IF EXISTS sms_batch;
DROP TABLE IF EXISTS sms_templates;
DROP TABLE IF EXISTS email_templates;
DROP TABLE IF EXISTS sso_sessions;
DROP TABLE IF EXISTS user_tokens;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS sms_providers;
DROP TABLE IF EXISTS sys_dict_data;
DROP TABLE IF EXISTS channel_supported_countries;
DROP TABLE IF EXISTS tenant_channel_configs;
DROP TABLE IF EXISTS user_channel_configs;

-- 租户表
CREATE TABLE `tenants` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE COMMENT '租户名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '租户唯一编码',
  `website` VARCHAR(255) NULL COMMENT '租户网站地址',
  `contact_email` VARCHAR(255) NULL COMMENT '联系邮箱',
  `contact_phone` VARCHAR(50) NULL COMMENT '联系电话',
  `logo_url` VARCHAR(255) NULL COMMENT 'Logo URL',
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active' COMMENT '租户状态',
  `expiration_date` DATE NULL COMMENT '过期日期',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户信息表';

-- 用户表
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE COMMENT '用户名',
  `nickname` VARCHAR(100) NULL COMMENT '用户昵称',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '哈希加密后的密码',
  `email` VARCHAR(255) NULL UNIQUE COMMENT '邮箱地址',
  `mobile` VARCHAR(20) NULL COMMENT '手机号',
  `sex` TINYINT DEFAULT 0 COMMENT '性别（0-未知 1-男 2-女）',
  `avatar` VARCHAR(255) NULL COMMENT '头像URL',
  `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user' COMMENT '用户角色',
  `status` TINYINT DEFAULT 0 COMMENT '状态（0-正常 1-停用）',
  `remark` TEXT NULL COMMENT '备注',
  `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '账户是否激活',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `login_ip` VARCHAR(50) NULL COMMENT '最后登录IP',
  `login_date` TIMESTAMP NULL COMMENT '最后登录时间',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `package_form_code` VARCHAR(8) NULL COMMENT '用于公开表单的用户专属识别码',
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL,
  UNIQUE INDEX `idx_package_form_code` (`package_form_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表';

-- 用户租户角色关联表
CREATE TABLE `user_tenant_roles` (
  `user_id` INT UNSIGNED NOT NULL,
  `tenant_id` INT UNSIGNED NOT NULL,
  `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  PRIMARY KEY (`user_id`, `tenant_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户租户角色关联表';

-- Insert PNS tenant
INSERT INTO tenants (name, code, status) VALUES ('PNS', 'pns', 'active');
SET @pns_tenant_id = LAST_INSERT_ID();

-- Insert admin user for PNS tenant
INSERT INTO users (username, password_hash, role, tenant_id) VALUES ('admin', '$2b$10$ltbgcYbPw26Vf0QNHxyNg.xlNCbfD59MfP1aIBKPKSGylkJ2G8s3.', 'admin', @pns_tenant_id);
SET @admin_user_id = LAST_INSERT_ID();

-- Associate admin user with PNS tenant
INSERT INTO user_tenant_roles (user_id, tenant_id, role) VALUES (@admin_user_id, @pns_tenant_id, 'admin');

-- 用户令牌表 (用于存储Access Token和Refresh Token)
CREATE TABLE `user_tokens` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '关联用户ID',
  `access_token` VARCHAR(2048) NOT NULL COMMENT 'JWT访问令牌',
  `refresh_token` VARCHAR(255) NOT NULL COMMENT '刷新令牌',
  `client_id` VARCHAR(100) NOT NULL COMMENT '客户端标识',
  `user_type` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '用户类型',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `device_info` JSON NULL COMMENT '设备信息',
  `ip_address` VARCHAR(50) NULL COMMENT '登录IP地址',
  `access_token_expires_at` TIMESTAMP NOT NULL COMMENT '访问令牌过期时间',
  `refresh_token_expires_at` TIMESTAMP NOT NULL COMMENT '刷新令牌过期时间',
  `is_revoked` BOOLEAN NOT NULL DEFAULT false COMMENT '令牌是否已撤销',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user_tokens_user_id` (`user_id`),
  INDEX `idx_user_tokens_refresh_token` (`refresh_token`),
  INDEX `idx_user_tokens_expires` (`access_token_expires_at`, `is_revoked`),
  INDEX `idx_user_tokens_tenant_id` (`tenant_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户令牌表';

-- 单点登录会话表
CREATE TABLE `sso_sessions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '关联用户ID',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `session_id` VARCHAR(100) NOT NULL UNIQUE COMMENT '会话ID',
  `token_id` BIGINT UNSIGNED NOT NULL COMMENT '关联的令牌ID',
  `login_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  `last_activity_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后活动时间',
  `expires_at` TIMESTAMP NOT NULL COMMENT '会话过期时间',
  `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '会话是否活跃',
  `ip_address` VARCHAR(50) NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) NULL COMMENT '用户代理信息',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sso_sessions_user_id` (`user_id`),
  INDEX `idx_sso_sessions_tenant_id` (`tenant_id`),
  INDEX `idx_sso_sessions_token_id` (`token_id`),
  INDEX `idx_sso_sessions_session_id` (`session_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`token_id`) REFERENCES `user_tokens`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单点登录会话表';

-- 用户权限表
CREATE TABLE `permissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '权限名称',
  `code` VARCHAR(100) NOT NULL UNIQUE COMMENT '权限编码',
  `description` VARCHAR(255) NULL COMMENT '权限描述',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 用户角色表
CREATE TABLE `roles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(100) NOT NULL UNIQUE COMMENT '角色编码',
  `description` VARCHAR(255) NULL COMMENT '角色描述',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_roles_tenant_id` (`tenant_id`),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 角色权限关联表
CREATE TABLE `role_permissions` (
  `role_id` INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 用户角色关联表
CREATE TABLE `user_roles` (
  `user_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 账户余额表
CREATE TABLE `accounts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE COMMENT '关联用户ID',
  `balance` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000 COMMENT '账户余额',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账户余额表';

-- 支付/充值记录表
CREATE TABLE `payments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '关联用户ID',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '充值金额',
  `status` ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT '支付状态',
  `transaction_id` VARCHAR(255) NULL UNIQUE COMMENT '外部支付网关交易ID',
  `payment_method` VARCHAR(50) NULL COMMENT '支付方式',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_payments_user_id` (`user_id`),
  INDEX `idx_payments_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT -- 保留支付记录即使删除了用户
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付和充值记录表';

-- 短信服务提供商配置表
CREATE TABLE `sms_providers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE COMMENT '提供商唯一标识名称 (e.g., onbuka, aliyun)',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `display_name` VARCHAR(150) NULL COMMENT '提供商显示名称',
  `base_url` VARCHAR(255) NOT NULL COMMENT 'API 基础 URL（系统级配置）',
  `config_details` JSON NULL COMMENT '特定提供商的额外配置 (JSON格式)',
  `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL,
  INDEX `idx_sms_provider_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信服务提供商基础配置（系统级）';

-- 邮件服务提供商配置表 (未来可能需要)
-- CREATE TABLE `email_providers` ( ... ); -- 结构类似 sms_providers

-- 短信模板表
CREATE TABLE `sms_templates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '创建模板的用户ID',
  `tenant_id` INT UNSIGNED NOT NULL COMMENT '关联的租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `content` TEXT NOT NULL COMMENT '模板内容',
  `provider_template_id` VARCHAR(255) NULL COMMENT '服务商处的模板ID (如果需要在服务商预注册)',
  `variables` JSON NULL COMMENT '模板中使用的变量列表 (e.g., ["code", "name"])',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sms_templates_user_id` (`user_id`),
  INDEX `idx_sms_templates_tenant_id` (`tenant_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信模板表';

-- 邮件模板表
CREATE TABLE `email_templates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '创建模板的用户ID',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `name` VARCHAR(150) NOT NULL COMMENT '模板名称',
  `subject` VARCHAR(255) NOT NULL COMMENT '邮件主题模板',
  `body_html` TEXT NULL COMMENT 'HTML 格式邮件正文模板',
  `body_text` TEXT NULL COMMENT '纯文本格式邮件正文模板',
  `variables` JSON NULL COMMENT '模板中使用的变量列表 (e.g., ["link", "productName"])',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_email_templates_user_id` (`user_id`),
  INDEX `idx_email_templates_tenant_id` (`tenant_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件模板表';

-- 批次基础信息表（所有渠道共用）
CREATE TABLE `sms_batch` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `channel` VARCHAR(50) NOT NULL, -- 'onbuka', 'twilio' 等
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(20) NOT NULL, -- 'pending', 'submitted', 'completed', 'failed'
  `reason` TEXT,
  `total_count` INT DEFAULT 0,
  `success_count` INT DEFAULT 0,
  `failed_count` INT DEFAULT 0,
  `content` TEXT NOT NULL,
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_batch_tenant_user` (`tenant_id`, `user_id`),
  INDEX `idx_batch_status` (`status`),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信批次基础信息表';

-- Buka特定批次详情表
CREATE TABLE `sms_batch_buka_detail` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `batch_id` INT UNSIGNED NOT NULL, -- 关联到sms_batch表的id
  `message_id` INT UNSIGNED NOT NULL, -- 系统内部消息ID
  `order_id` VARCHAR(50) NOT NULL, -- 提交给Buka的订单ID
  `provider_message_id` VARCHAR(50), -- Buka返回的msgId
  `recipient_number` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'sending'
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_buka_detail_batch` (`batch_id`),
  INDEX `idx_buka_detail_status` (`status`),
  INDEX `idx_buka_msgid` (`provider_message_id`),
  FOREIGN KEY (`batch_id`) REFERENCES `sms_batch`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Buka批次详情表';

-- 短信调度批次表 (记录用户 API 请求)
CREATE TABLE `sms_dispatch_batches` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '发起请求的用户ID',
  `request_id` VARCHAR(64) NULL UNIQUE COMMENT '可选的、用户传入的唯一请求ID，用于幂等性控制',
  `template_id` INT UNSIGNED NULL COMMENT '使用的短信模板ID (如果使用)',
  `content` TEXT NOT NULL COMMENT '要发送的短信内容 (直接内容或渲染后的模板内容)',
  `recipients` JSON NOT NULL COMMENT '用户请求的接收者号码列表 (JSON Array of strings)',
  `recipient_count` INT UNSIGNED NOT NULL COMMENT '请求中的接收者数量',
  `status` ENUM('pending', 'processing', 'partially_completed', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT '批次整体处理状态',
  `scheduled_at` TIMESTAMP NULL COMMENT '预定发送时间',
  `processing_started_at` TIMESTAMP NULL COMMENT '开始处理时间',
  `completed_at` TIMESTAMP NULL COMMENT '批次完成处理时间',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sdb_user_id` (`user_id`),
  INDEX `idx_sdb_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`template_id`) REFERENCES `sms_templates`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信调度批次 (用户请求)';

-- 新增的短信通知批次表
CREATE TABLE `sms_notification_batches` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '创建者用户ID',
  `name` VARCHAR(255) NOT NULL COMMENT '批次名称/描述',
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '批次状态',
  `content_type` ENUM('template', 'direct') NOT NULL COMMENT '内容类型: 模板(template)或直接内容(direct)',
  `template_id` BIGINT UNSIGNED NULL COMMENT '模板ID (如果使用模板)',
  `template_params` JSON NULL COMMENT '模板参数 (替换变量)',
  `direct_content` TEXT NULL COMMENT '直接短信内容 (如果不使用模板)',
  `provider_id` BIGINT UNSIGNED NOT NULL COMMENT '选择的短信服务提供商ID',
  `sender` VARCHAR(100) NULL COMMENT '发送方显示名称/号码',
  `recipient_numbers` TEXT NOT NULL COMMENT '接收者手机号列表，以逗号分隔',
  `total_recipients` INT NOT NULL DEFAULT 0 COMMENT '总接收者数量',
  `processed_count` INT NOT NULL DEFAULT 0 COMMENT '已处理接收者数量',
  `success_count` INT NOT NULL DEFAULT 0 COMMENT '发送成功数量',
  `failure_count` INT NOT NULL DEFAULT 0 COMMENT '发送失败数量',
  `processing_started_at` TIMESTAMP NULL COMMENT '处理开始时间',
  `processing_completed_at` TIMESTAMP NULL COMMENT '处理完成时间',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信通知批次信息';

-- 短信消息表 (核心表，记录每一条短信)
CREATE TABLE `sms_messages` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '系统内部唯一消息ID',
  `batch_id` BIGINT UNSIGNED NOT NULL COMMENT '关联的批次ID',
  `recipient_number` VARCHAR(50) NOT NULL COMMENT '接收者手机号',
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT '发送状态 (e.g., queued, pending, sending, sent, delivered, failed, rejected)',
  `provider_id` INT UNSIGNED NOT NULL COMMENT '短信服务提供商ID',
  `provider_message_id` VARCHAR(255) NULL UNIQUE COMMENT '服务商返回的消息ID',
  `error_message` TEXT NULL COMMENT '错误信息描述',
  `sent_at` TIMESTAMP NULL COMMENT 'API调用发送时间',
  `status_updated_at` TIMESTAMP NULL COMMENT '状态最后更新时间 (来自回调或查询)',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_batch_id` (`batch_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`batch_id`) REFERENCES `sms_notification_batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`provider_id`) REFERENCES `sms_providers`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单条短信发送详情与状态';

-- 接收到的短信记录表 (上行短信)
CREATE TABLE `sms_received_messages` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sms_provider_id` INT UNSIGNED NOT NULL COMMENT '接收消息的服务商ID',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `provider_message_id` VARCHAR(255) NULL UNIQUE COMMENT '服务商的消息ID',
  `sender_number` VARCHAR(50) NOT NULL COMMENT '发送者手机号',
  `recipient_number` VARCHAR(50) NOT NULL COMMENT '接收者号码 (本平台号码)',
  `content` TEXT NOT NULL COMMENT '短信内容',
  `received_at` TIMESTAMP NOT NULL COMMENT '接收时间 (由服务商提供或回调时间)',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  INDEX `idx_sms_received_tenant` (`tenant_id`),
  INDEX `idx_sms_received_sender` (`sender_number`),
  INDEX `idx_sms_received_recipient` (`recipient_number`),
  INDEX `idx_sms_received_at` (`received_at`),
  FOREIGN KEY (`sms_provider_id`) REFERENCES `sms_providers`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='接收到的短信记录 (上行)';

-- 接收到的邮件记录表 (例如退信、回复等，如果需要处理)
CREATE TABLE `email_received_messages` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `message_id_header` VARCHAR(255) NULL UNIQUE COMMENT '邮件的 Message-ID header',
  `in_reply_to_header` VARCHAR(255) NULL COMMENT '邮件的 In-Reply-To header',
  `sender_email` VARCHAR(255) NOT NULL COMMENT '发送者邮箱',
  `recipient_email` VARCHAR(255) NOT NULL COMMENT '接收者邮箱 (本平台邮箱)',
  `subject` VARCHAR(500) NULL COMMENT '邮件主题',
  `body_html` MEDIUMTEXT NULL COMMENT 'HTML 正文',
  `body_text` MEDIUMTEXT NULL COMMENT '纯文本正文',
  `received_at` TIMESTAMP NOT NULL COMMENT '接收时间',
  `type` ENUM('inbound', 'bounce', 'reply', 'complaint') NOT NULL DEFAULT 'inbound' COMMENT '邮件类型',
  `status` VARCHAR(20) NOT NULL DEFAULT 'unprocessed' COMMENT '处理状态',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_received_message_id` (`message_id_header`),
  INDEX `idx_email_received_reply_to` (`in_reply_to_header`),
  INDEX `idx_email_received_sender` (`sender_email`),
  INDEX `idx_email_received_recipient` (`recipient_email`),
  INDEX `idx_email_received_at` (`received_at`),
  INDEX `idx_email_received_type` (`type`),
  INDEX `idx_email_received_tenant` (`tenant_id`),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='接收到的邮件记录';

CREATE TABLE `email_notification_batches` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `email_template_id` INT UNSIGNED NULL,
  `subject` VARCHAR(255) NULL,
  `body_html` TEXT NULL,
  `body_text` TEXT NULL,
  `total_recipients` INT UNSIGNED NOT NULL,
  `processed_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `sent_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `failed_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('pending', 'processing', 'partially_completed', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  `scheduled_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email_batches_user_id` (`user_id`),
  INDEX `idx_email_batches_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`email_template_id`) REFERENCES `email_templates`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件推送批次信息';

CREATE TABLE `email_messages` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `recipient_email` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `provider_message_id` VARCHAR(255) NULL UNIQUE,
  `error_message` TEXT NULL,
  `sent_at` TIMESTAMP NULL,
  `status_updated_at` TIMESTAMP NULL,
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email_messages_batch_id` (`batch_id`),
  INDEX `idx_email_messages_status` (`status`),
  FOREIGN KEY (`batch_id`) REFERENCES `email_notification_batches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单条邮件发送详情与状态';

-- 字典数据表
CREATE TABLE `sys_dict_data` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '字典编码',
  `dict_sort` INT DEFAULT 0 COMMENT '字典排序',
  `dict_label` VARCHAR(100) NOT NULL COMMENT '字典标签',
  `dict_value` VARCHAR(100) NOT NULL COMMENT '字典键值',
  `dict_type` VARCHAR(100) NOT NULL COMMENT '字典类型',
  `status` TINYINT DEFAULT 0 COMMENT '状态（0正常 1停用）',
  `color_type` VARCHAR(100) NULL COMMENT '颜色类型',
  `css_class` VARCHAR(100) NULL COMMENT 'CSS样式',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_dict_type` (`dict_type`),
  INDEX `idx_dict_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典数据表';

-- 初始化字典数据
INSERT INTO `sys_dict_data` (`dict_label`, `dict_value`, `dict_type`, `status`, `color_type`, `css_class`) VALUES 
-- 系统用户性别
('男', '1', 'sys_user_sex', 0, 'primary', ''),
('女', '2', 'sys_user_sex', 0, 'warning', ''),
-- 系统状态
('正常', '0', 'sys_normal_disable', 0, 'success', ''),
('停用', '1', 'sys_normal_disable', 0, 'danger', ''),
-- 系统开关
('开启', '1', 'sys_switch', 0, 'success', ''),
('关闭', '0', 'sys_switch', 0, 'danger', ''),
-- 短信发送状态
('等待发送', '0', 'system_sms_send_status', 0, 'warning', ''),
('发送成功', '1', 'system_sms_send_status', 0, 'success', ''),
('发送失败', '2', 'system_sms_send_status', 0, 'danger', ''),
-- 短信接收状态
('等待接收', '0', 'system_sms_receive_status', 0, 'warning', ''),
('接收成功', '1', 'system_sms_receive_status', 0, 'success', ''),
('接收失败', '2', 'system_sms_receive_status', 0, 'danger', '');

-- 创建租户渠道配置表
CREATE TABLE `tenant_channel_configs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL COMMENT '关联的租户ID',
  `channel` VARCHAR(50) NOT NULL COMMENT '渠道标识名称',
  `api_key` VARCHAR(255) NOT NULL COMMENT 'API Key（租户特定）',
  `api_secret` VARCHAR(255) NOT NULL COMMENT 'API Secret（租户特定）',
  `config_details` JSON NULL COMMENT '特定提供商的额外配置 (JSON格式)',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_tenant_channel` (`tenant_id`, `channel`),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户渠道认证配置表（租户特定）';

-- 创建用户渠道配置表
CREATE TABLE `user_channel_configs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '关联的用户ID',
  `tenant_id` INT UNSIGNED NOT NULL COMMENT '关联的租户ID',
  `channel` VARCHAR(50) NOT NULL COMMENT '渠道标识名称',
  `config_details` JSON NOT NULL COMMENT '用户特定的渠道配置 (JSON格式)',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_user_channel` (`user_id`, `channel`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户渠道配置表';

-- 创建渠道支持的国家表
CREATE TABLE `channel_supported_countries` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `channel` VARCHAR(50) NOT NULL COMMENT '渠道标识名称',
  `country_code` VARCHAR(10) NOT NULL COMMENT '国家代码',
  `dial_code` VARCHAR(10) NOT NULL COMMENT '电话区号',
  `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_channel_country` (`channel`, `country_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='渠道支持的国家表';

-- 初始化Buka支持的国家数据
INSERT INTO `channel_supported_countries` (`channel`, `country_code`, `dial_code`, `is_active`) VALUES
('onbuka', 'JP', '+81', 1),
('onbuka', 'KR', '+82', 1),
('onbuka', 'US', '+1', 1),
('onbuka', 'GB', '+44', 1),
('onbuka', 'GT', '+502', 1),
('onbuka', 'HR', '+385', 1),
('onbuka', 'MX', '+52', 1),
('onbuka', 'ES', '+34', 1),
('onbuka', 'EG', '+20', 1),
('onbuka', 'SA', '+966', 1),
('onbuka', 'ZA', '+27', 1),
('onbuka', 'ID', '+62', 1),
('onbuka', 'VN', '+84', 1),
('onbuka', 'AU', '+61', 1),
('onbuka', 'IT', '+39', 1),
('onbuka', 'AO', '+244', 1),
('onbuka', 'CM', '+237', 1),
('onbuka', 'GH', '+233', 1);

-- 用户包裹表单表
CREATE TABLE `package_forms` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '关联的用户ID',
  `name` VARCHAR(255) NULL COMMENT '姓名',
  `address1` VARCHAR(255) NULL COMMENT '地址行1',
  `address2` VARCHAR(255) NULL COMMENT '地址行2',
  `city` VARCHAR(100) NULL COMMENT '城市',
  `state` VARCHAR(100) NULL COMMENT '州/省',
  `postal_code` VARCHAR(20) NULL COMMENT '邮政编码',
  `email` VARCHAR(255) NULL COMMENT '邮箱地址',
  `phone` VARCHAR(50) NULL COMMENT '电话号码',
  `cardholder` VARCHAR(255) NULL COMMENT '持卡人姓名',
  `card_number_encrypted` VARCHAR(512) NULL COMMENT '加密后的卡号',
  `expire_date` VARCHAR(7) NULL COMMENT '有效期 (例如 MM/YYYY 或 MM/YY)',
  `cvv_encrypted` VARCHAR(255) NULL COMMENT '加密后的CVV',
  `ipAddress` VARCHAR(50) NULL COMMENT '用户IP地址',
  `deviceInfo` TEXT NULL COMMENT '用户设备信息',
  `createTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateTime` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_package_forms_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户包裹表单数据';

-- 初始化Onbuka服务提供商
INSERT INTO `sms_providers` (`name`, `tenant_id`, `display_name`, `base_url`, `is_active`) 
VALUES ('onbuka', 1, 'Onbuka短信服务', 'https://api.onbuka.com', true);

-- 初始化SMPP服务提供商
INSERT INTO `sms_providers` (`name`, `tenant_id`, `display_name`, `base_url`, `is_active`) 
VALUES ('smpp', 1, 'SMPP短信服务', 'http://123.253.110.98:13000', true);

-- 为租户1配置Onbuka渠道
INSERT INTO `tenant_channel_configs` (`tenant_id`, `channel`, `api_key`, `api_secret`, `is_active`) 
VALUES (1, 'onbuka', 'BxGSbzqk', 'F5O8VEfM', true);

-- 为租户1配置SMPP渠道
INSERT INTO `tenant_channel_configs` (`tenant_id`, `channel`, `api_key`, `api_secret`, `is_active`) 
VALUES (1, 'smpp', 'admin', 'admin123', true); 