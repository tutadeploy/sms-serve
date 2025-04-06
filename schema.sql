-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `sms_serve` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 确保root用户可以从任何IP访问
ALTER USER 'root'@'%' IDENTIFIED BY 'smsserver';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
-- 如果特定IP需要访问权限，显式创建
CREATE USER IF NOT EXISTS 'root'@'192.168.65.1' IDENTIFIED BY 'smsserver';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'192.168.65.1' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- 创建用户并授权
CREATE USER IF NOT EXISTS 'sms_serve_user'@'%' IDENTIFIED BY 'smsserver';
GRANT ALL PRIVILEGES ON sms_serve.* TO 'sms_serve_user'@'%';
FLUSH PRIVILEGES;

USE sms_serve;

-- 用户表
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE COMMENT '用户名',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '哈希加密后的密码',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱地址',
  `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user' COMMENT '用户角色',
  `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '账户是否激活',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表';

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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户信息表';

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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 用户角色表
CREATE TABLE `roles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(100) NOT NULL UNIQUE COMMENT '角色编码',
  `description` VARCHAR(255) NULL COMMENT '角色描述',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_payments_user_id` (`user_id`),
  INDEX `idx_payments_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT -- 保留支付记录即使删除了用户
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付和充值记录表';

-- 短信服务提供商配置表
CREATE TABLE `sms_providers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE COMMENT '提供商唯一标识名称 (e.g., onbuka, aliyun)',
  `display_name` VARCHAR(150) NULL COMMENT '提供商显示名称',
  `api_key` VARCHAR(255) NULL COMMENT 'API Key',
  `api_secret` VARCHAR(255) NULL COMMENT 'API Secret',
  `base_url` VARCHAR(255) NULL COMMENT 'API 基础 URL',
  `config_details` JSON NULL COMMENT '特定提供商的额外配置 (JSON格式, e.g., onbuka appid)',
  `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信服务提供商配置';

-- 邮件服务提供商配置表 (未来可能需要)
-- CREATE TABLE `email_providers` ( ... ); -- 结构类似 sms_providers

-- 短信模板表
CREATE TABLE `sms_templates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL COMMENT '创建模板的用户ID',
  `tenant_id` INT UNSIGNED NULL COMMENT '关联的租户ID',
  `name` VARCHAR(150) NOT NULL COMMENT '模板名称',
  `content` TEXT NOT NULL COMMENT '短信模板内容',
  `provider_template_id` VARCHAR(100) NULL COMMENT '在服务商平台的模板ID (可选)',
  `variables` JSON NULL COMMENT '模板中使用的变量列表 (e.g., ["code", "userName"])',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sms_templates_user_id` (`user_id`),
  INDEX `idx_sms_templates_tenant_id` (`tenant_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_email_templates_user_id` (`user_id`),
  INDEX `idx_email_templates_tenant_id` (`tenant_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件模板表';

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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sdb_user_id` (`user_id`),
  INDEX `idx_sdb_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`template_id`) REFERENCES `sms_templates`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信调度批次 (用户请求)';

-- 短信消息表 (核心表，记录每一条短信)
CREATE TABLE `sms_messages` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '系统内部唯一消息ID',
  `dispatch_batch_id` BIGINT UNSIGNED NOT NULL COMMENT '关联的用户请求批次ID',
  `recipient_number` VARCHAR(50) NOT NULL COMMENT '接收者手机号',
  `provider_id` INT UNSIGNED NOT NULL COMMENT '最终选择的短信服务商ID',
  `provider_msgid` VARCHAR(255) NULL COMMENT '服务商返回的消息ID',
  `provider_orderid` VARCHAR(255) NULL COMMENT '发送时传递给服务商的自定义ID (如果支持，例如用本表id)',
  `status` ENUM('pending', 'queued', 'submitted', 'sent', 'delivered', 'failed', 'rejected', 'unknown') NOT NULL DEFAULT 'pending' COMMENT '标准化的短信状态',
  `provider_status_code` VARCHAR(100) NULL COMMENT '服务商返回的原始状态码或描述',
  `error_message` TEXT NULL COMMENT '发送失败或状态查询时的错误信息',
  `submitted_at` TIMESTAMP NULL COMMENT '成功提交给服务商的时间',
  `provider_reported_at` TIMESTAMP NULL COMMENT '服务商报告的发送/送达时间',
  `last_status_check_at` TIMESTAMP NULL COMMENT '最后一次主动查询状态的时间',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  INDEX `idx_sm_dispatch_batch_id` (`dispatch_batch_id`),
  INDEX `idx_sm_recipient_number` (`recipient_number`),
  INDEX `idx_sm_status` (`status`),
  INDEX `idx_sm_provider_msgid` (`provider_msgid`),
  INDEX `idx_sm_provider_id_status` (`provider_id`, `status`), -- 用于状态查询优化
  UNIQUE KEY `uk_sm_provider_msgid` (`provider_id`, `provider_msgid`), -- 确保同一服务商的消息ID唯一
  FOREIGN KEY (`dispatch_batch_id`) REFERENCES `sms_dispatch_batches`(`id`) ON DELETE CASCADE,
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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

-- 初始化租户
INSERT INTO `tenants` (`name`, `code`, `status`) VALUES ('josiah', 'josiah', 'active');

-- 初始化管理员账号 (密码: admin123)
INSERT INTO `users` (`username`, `password_hash`, `email`, `role`, `tenant_id`, `is_active`) 
SELECT 'admin', '$2b$10$86jAxdfS/LNV5slBvedzQuoj5jCYF9SBQyz8nnGkzr0LRZIhjgZvq', 'admin@example.com', 'admin', id, true 
FROM `tenants` WHERE `code` = 'josiah';

-- 初始化管理员账户余额
INSERT INTO `accounts` (`user_id`, `balance`) 
SELECT `id`, 0 FROM `users` WHERE `username` = 'admin'; 