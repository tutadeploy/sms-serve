import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';
import * as dotenv from 'dotenv';

// 定义数据库配置类型
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * 获取TypeORM模块配置
 * @param configService 配置服务
 * @returns TypeORM模块配置选项
 */
export const getTypeOrmModuleOptions = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  // 获取配置对象中的数据库配置
  const dbConfig = configService.get<DatabaseConfig>('database');

  return {
    type: 'mysql',
    host: dbConfig?.host,
    port: dbConfig?.port,
    username: dbConfig?.username,
    password: dbConfig?.password,
    database: dbConfig?.database,
    entities: ['dist/**/*.entity.js'],
    synchronize: false,
    logging: true,
    logger: 'advanced-console',
    namingStrategy: new SnakeNamingStrategy(),
    charset: 'utf8mb4_unicode_ci',
    extra: {
      charset: 'utf8mb4_unicode_ci',
    },
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
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    logging: true,
    entities: [join(__dirname, '../../**/*.entity.{js,ts}')],
    migrations: [join(__dirname, '../../../db/migrations', '*.{js,ts}')],
    migrationsTableName: 'typeorm_migrations',
    namingStrategy: new SnakeNamingStrategy(),
    charset: 'utf8mb4_unicode_ci',
    extra: {
      charset: 'utf8mb4_unicode_ci',
    },
  };
};
