import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSimpleSmsNotificationBatchFields1743800777777
  implements MigrationInterface
{
  name = 'AddSimpleSmsNotificationBatchFields1743800777777';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加新字段
    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` ADD \`content_type\` enum ('template', 'direct') NULL COMMENT '内容类型：模板或直接内容' DEFAULT 'template'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` ADD \`direct_content\` text NULL COMMENT '直接发送的内容（如果不使用模板）'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` ADD \`processed_count\` int UNSIGNED NULL COMMENT '已处理的消息数量'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` ADD \`success_count\` int UNSIGNED NULL COMMENT '成功发送的消息数量'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` ADD \`failure_count\` int UNSIGNED NULL COMMENT '发送失败的消息数量'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` ADD \`processing_completed_at\` timestamp NULL COMMENT '处理完成时间'`,
    );

    // 修改短信状态枚举类型，添加sending状态
    await queryRunner.query(
      `ALTER TABLE \`sms_messages\` MODIFY \`status\` enum ('pending', 'queued', 'submitted', 'sent', 'delivered', 'failed', 'rejected', 'unknown', 'sending') NOT NULL DEFAULT 'pending' COMMENT '标准化的短信状态'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 还原短信状态枚举类型
    await queryRunner.query(
      `ALTER TABLE \`sms_messages\` MODIFY \`status\` enum ('pending', 'queued', 'submitted', 'sent', 'delivered', 'failed', 'rejected', 'unknown') NOT NULL DEFAULT 'pending' COMMENT '标准化的短信状态'`,
    );

    // 删除添加的字段
    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` DROP COLUMN \`processing_completed_at\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` DROP COLUMN \`failure_count\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` DROP COLUMN \`success_count\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` DROP COLUMN \`processed_count\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` DROP COLUMN \`direct_content\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`sms_dispatch_batches\` DROP COLUMN \`content_type\``,
    );
  }
}
