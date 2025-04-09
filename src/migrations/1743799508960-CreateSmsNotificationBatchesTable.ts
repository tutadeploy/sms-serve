import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSmsNotificationBatchesTable1743799508960
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 sms_notification_batches 表
    await queryRunner.query(`
            CREATE TABLE \`sms_notification_batches\` (
                \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                \`user_id\` INT UNSIGNED NOT NULL COMMENT '创建者用户ID',
                \`name\` VARCHAR(255) NOT NULL COMMENT '批次名称/描述',
                \`status\` ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '批次状态',
                \`content_type\` ENUM('template', 'direct') NOT NULL COMMENT '内容类型: 模板(template)或直接内容(direct)',
                \`template_id\` BIGINT UNSIGNED NULL COMMENT '模板ID (如果使用模板)',
                \`template_params\` JSON NULL COMMENT '模板参数 (替换变量)',
                \`direct_content\` TEXT NULL COMMENT '直接短信内容 (如果不使用模板)',
                \`provider_id\` BIGINT UNSIGNED NOT NULL COMMENT '选择的短信服务提供商ID',
                \`sender\` VARCHAR(100) NULL COMMENT '发送方显示名称/号码',
                \`recipient_numbers\` TEXT NOT NULL COMMENT '接收者手机号列表，以逗号分隔',
                \`total_recipients\` INT NOT NULL DEFAULT 0 COMMENT '总接收者数量',
                \`processed_count\` INT NOT NULL DEFAULT 0 COMMENT '已处理接收者数量',
                \`success_count\` INT NOT NULL DEFAULT 0 COMMENT '发送成功数量',
                \`failure_count\` INT NOT NULL DEFAULT 0 COMMENT '发送失败数量',
                \`processing_started_at\` TIMESTAMP NULL COMMENT '处理开始时间',
                \`processing_completed_at\` TIMESTAMP NULL COMMENT '处理完成时间',
                \`createTime\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                \`updateTime\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                INDEX \`idx_user_id\` (\`user_id\`),
                INDEX \`idx_status\` (\`status\`),
                FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信通知批次信息';
        `);

    // 创建 sms_messages 表
    await queryRunner.query(`
            CREATE TABLE \`sms_messages\` (
                \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                \`batch_id\` BIGINT UNSIGNED NOT NULL COMMENT '所属推送批次ID',
                \`recipient_number\` VARCHAR(50) NOT NULL COMMENT '接收者手机号',
                \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT '发送状态 (e.g., queued, pending, sending, sent, delivered, failed, rejected)',
                \`provider_message_id\` VARCHAR(255) NULL UNIQUE COMMENT '服务商返回的消息ID',
                \`status_code\` VARCHAR(50) NULL COMMENT '服务商返回的状态码',
                \`error_message\` TEXT NULL COMMENT '错误信息描述',
                \`sent_at\` TIMESTAMP NULL COMMENT 'API调用发送时间',
                \`status_updated_at\` TIMESTAMP NULL COMMENT '状态最后更新时间 (来自回调或查询)',
                \`createTime\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                \`updateTime\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                INDEX \`idx_batch_id\` (\`batch_id\`),
                INDEX \`idx_status\` (\`status\`),
                FOREIGN KEY (\`batch_id\`) REFERENCES \`sms_notification_batches\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单条短信发送详情与状态';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 先删除依赖表
    await queryRunner.query(`DROP TABLE IF EXISTS \`sms_messages\``);
    // 再删除主表
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`sms_notification_batches\``,
    );
  }
}
