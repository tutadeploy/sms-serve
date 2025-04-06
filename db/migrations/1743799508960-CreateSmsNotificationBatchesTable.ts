import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSmsNotificationBatchesTable1743799508960
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 不需要创建表，因为已经有了，只需更新它们之间的关系
    // 先检查表是否存在
    const tableExists = await queryRunner.hasTable('sms_dispatch_batches');

    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE \`sms_dispatch_batches\` (
          \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`user_id\` INT UNSIGNED NOT NULL COMMENT '发起请求的用户ID',
          \`request_id\` VARCHAR(64) NULL UNIQUE COMMENT '可选的、用户传入的唯一请求ID，用于幂等性控制',
          \`template_id\` INT UNSIGNED NULL COMMENT '使用的短信模板ID (如果使用)',
          \`content\` TEXT NOT NULL COMMENT '要发送的短信内容 (直接内容或渲染后的模板内容)',
          \`recipients\` JSON NOT NULL COMMENT '用户请求的接收者号码列表 (JSON Array of strings)',
          \`recipient_count\` INT UNSIGNED NOT NULL COMMENT '请求中的接收者数量',
          \`status\` ENUM('pending', 'processing', 'partially_completed', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT '批次整体处理状态',
          \`scheduled_at\` TIMESTAMP NULL COMMENT '预定发送时间',
          \`processing_started_at\` TIMESTAMP NULL COMMENT '开始处理时间',
          \`completed_at\` TIMESTAMP NULL COMMENT '批次完成处理时间',
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX \`idx_sdb_user_id\` (\`user_id\`),
          INDEX \`idx_sdb_status\` (\`status\`),
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
          FOREIGN KEY (\`template_id\`) REFERENCES \`sms_templates\`(\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信调度批次 (用户请求)';
      `);
    }

    // 检查messages表中的字段，如果需要修改外键关系
    try {
      // 移除现有外键（如果有）
      await queryRunner.query(`
        ALTER TABLE \`sms_messages\` 
        DROP FOREIGN KEY IF EXISTS \`FK_sms_messages_batch_id\`;
      `);

      // 修改batch_id列名称为dispatch_batch_id（如果尚未修改）
      const columnsInfo = await queryRunner.query(`
        SHOW COLUMNS FROM \`sms_messages\` LIKE 'dispatch_batch_id';
      `);

      if (!columnsInfo.length) {
        // 列不存在，需要重命名或添加
        await queryRunner.query(`
          ALTER TABLE \`sms_messages\` 
          CHANGE COLUMN \`batch_id\` \`dispatch_batch_id\` BIGINT UNSIGNED NOT NULL COMMENT '关联的用户请求批次ID';
        `);
      }

      // 添加新的外键关系
      await queryRunner.query(`
        ALTER TABLE \`sms_messages\` 
        ADD CONSTRAINT \`FK_sms_messages_dispatch_batch_id\` 
        FOREIGN KEY (\`dispatch_batch_id\`) REFERENCES \`sms_dispatch_batches\`(\`id\`) ON DELETE CASCADE;
      `);
    } catch (error) {
      console.log('操作sms_messages表时出错:', error);
      // 容忍错误并继续
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 如果是我们创建的表，则删除
    const tableExists = await queryRunner.hasTable('sms_dispatch_batches');
    if (tableExists) {
      try {
        // 移除外键关系
        await queryRunner.query(`
          ALTER TABLE \`sms_messages\` 
          DROP FOREIGN KEY IF EXISTS \`FK_sms_messages_dispatch_batch_id\`;
        `);
      } catch (error) {
        console.log('移除外键时出错:', error);
      }

      // 删除表
      await queryRunner.query(`DROP TABLE IF EXISTS \`sms_dispatch_batches\``);
    }
  }
}
