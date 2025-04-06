import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1743757044550 implements MigrationInterface {
  name = 'Migration1743757044550';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT;`,
    );

    // Commented out foreign key additions
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_templates\` ADD CONSTRAINT \`FK_aed4b79d60fbc9d43f7e1cdacca\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_received_messages\` ADD CONSTRAINT \`FK_cec3b2031dfa2a8fac79f614b3c\` FOREIGN KEY (\`sms_provider_id\`) REFERENCES \`sms_providers\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_messages\` ADD CONSTRAINT \`FK_37ed6a46f8a42f0eac8a18120d0\` FOREIGN KEY (\`batch_id\`) REFERENCES \`sms_notification_batches\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_notification_batches\` ADD CONSTRAINT \`FK_d44e9461c1272d51b9a4979ec04\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_notification_batches\` ADD CONSTRAINT \`FK_c0806e60d438ca45ad3732366e8\` FOREIGN KEY (\`sms_template_id\`) REFERENCES \`sms_templates\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_notification_batches\` ADD CONSTRAINT \`FK_bf968a0571d877b3eaa0463e00d\` FOREIGN KEY (\`sms_provider_id\`) REFERENCES \`sms_providers\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_427785468fb7d2733f59e7d7d39\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`email_templates\` ADD CONSTRAINT \`FK_513421601bd786a33c5a7238f45\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`email_messages\` ADD CONSTRAINT \`FK_71e3eda7c4f6f8aabc04ddf6a54\` FOREIGN KEY (\`batch_id\`) REFERENCES \`email_notification_batches\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`email_notification_batches\` ADD CONSTRAINT \`FK_9f4e430c1c80093618e4ee92f66\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`email_notification_batches\` ADD CONSTRAINT \`FK_ac9f76352644690608b020e443c\` FOREIGN KEY (\`email_template_id\`) REFERENCES \`email_templates\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`accounts\` ADD CONSTRAINT \`FK_3000dad1da61b29953f07476324\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    // );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Commented out foreign key drops
    // await queryRunner.query(
    //   `ALTER TABLE \`accounts\` DROP FOREIGN KEY \`FK_3000dad1da61b29953f07476324\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`email_notification_batches\` DROP FOREIGN KEY \`FK_ac9f76352644690608b020e443c\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`email_notification_batches\` DROP FOREIGN KEY \`FK_9f4e430c1c80093618e4ee92f66\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`email_messages\` DROP FOREIGN KEY \`FK_71e3eda7c4f6f8aabc04ddf6a54\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`email_templates\` DROP FOREIGN KEY \`FK_513421601bd786a33c5a7238f45\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_427785468fb7d2733f59e7d7d39\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_notification_batches\` DROP FOREIGN KEY \`FK_bf968a0571d877b3eaa0463e00d\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_notification_batches\` DROP FOREIGN KEY \`FK_c0806e60d438ca45ad3732366e8\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_notification_batches\` DROP FOREIGN KEY \`FK_d44e9461c1272d51b9a4979ec04\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_messages\` DROP FOREIGN KEY \`FK_37ed6a46f8a42f0eac8a18120d0\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_received_messages\` DROP FOREIGN KEY \`FK_cec3b2031dfa2a8fac79f614b3c\``,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`sms_templates\` DROP FOREIGN KEY \`FK_aed4b79d60fbc9d43f7e1cdacca\``,
    // );

    // Only revert users.id type change in this step
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`id\` int NOT NULL AUTO_INCREMENT;`,
    );
  }
}
