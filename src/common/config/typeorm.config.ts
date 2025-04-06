import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';
import * as dotenv from 'dotenv';

/**
 * 获取TypeORM模块配置
 * @param configService 配置服务
 * @returns TypeORM模块配置选项
 */
export const getTypeOrmModuleOptions = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  return {
    type: 'mysql',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE'),
    entities: ['dist/**/*.entity.js'],
    synchronize: false, // 禁用同步以避免自动修改数据库结构
    logging: process.env.NODE_ENV === 'development',
    namingStrategy: new SnakeNamingStrategy(),
    charset: 'utf8mb4',
    extra: {
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
    },
    url: `mysql://${configService.get<string>('DB_USERNAME')}:${configService.get<string>('DB_PASSWORD')}@${configService.get<string>('DB_HOST')}:${configService.get<number>('DB_PORT')}/${configService.get<string>('DB_DATABASE')}?charset=utf8mb4`,
  };
};

/**
 * 获取TypeORM数据源配置（用于迁移等CLI操作）
 * @returns TypeORM数据源配置选项
 */
export const getTypeOrmDataSourceOptions = (): DataSourceOptions => {
  // 确保环境变量已加载
  dotenv.config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  });

  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false, // CLI操作中始终禁用同步
    logging: true,
    entities: [join(__dirname, '../../**/*.entity.{js,ts}')],
    migrations: [join(__dirname, '../../../db/migrations', '*.{js,ts}')],
    migrationsTableName: 'typeorm_migrations',
    namingStrategy: new SnakeNamingStrategy(),
    charset: 'utf8mb4',
    extra: {
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
    },
  };
};
