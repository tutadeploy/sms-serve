import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddForeignKeys1743999999999 implements MigrationInterface {
  name = 'AddForeignKeys1743999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`email_templates\` CHANGE \`user_id\` \`user_id\` int UNSIGNED NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_notification_batches\` CHANGE \`user_id\` \`user_id\` int UNSIGNED NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_427785468fb7d2733f59e7d7d39\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_templates\` ADD CONSTRAINT \`FK_513421601bd786a33c5a7238f45\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_messages\` ADD CONSTRAINT \`FK_71e3eda7c4f6f8aabc04ddf6a54\` FOREIGN KEY (\`batch_id\`) REFERENCES \`email_notification_batches\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_notification_batches\` ADD CONSTRAINT \`FK_9f4e430c1c80093618e4ee92f66\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_notification_batches\` ADD CONSTRAINT \`FK_ac9f76352644690608b020e443c\` FOREIGN KEY (\`email_template_id\`) REFERENCES \`email_templates\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`accounts\` ADD CONSTRAINT \`FK_3000dad1da61b29953f07476324\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`accounts\` DROP FOREIGN KEY \`FK_3000dad1da61b29953f07476324\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_notification_batches\` DROP FOREIGN KEY \`FK_ac9f76352644690608b020e443c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_notification_batches\` DROP FOREIGN KEY \`FK_9f4e430c1c80093618e4ee92f66\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_messages\` DROP FOREIGN KEY \`FK_71e3eda7c4f6f8aabc04ddf6a54\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_templates\` DROP FOREIGN KEY \`FK_513421601bd786a33c5a7238f45\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_427785468fb7d2733f59e7d7d39\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_notification_batches\` CHANGE \`user_id\` \`user_id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_templates\` CHANGE \`user_id\` \`user_id\` int NOT NULL`,
    );
  }
}
