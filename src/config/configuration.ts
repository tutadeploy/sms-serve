import * as dotenv from 'dotenv';

const loadEnv = () => {
  const env = process.env.NODE_ENV || 'development';
  const envFile = `.env.${env}`;

  // 先加载基础配置
  dotenv.config();
  // 再加载环境特定配置
  dotenv.config({ path: envFile });
};

// 预加载环境变量，确保后续配置可以使用
loadEnv();

// 定义配置结构
interface Configuration {
  database: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
}

// 导出配置工厂函数
export default (): Configuration => {
  return {
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'sms-serve:',
    },
  };
};

// 导出单独的配置项，以便兼容旧代码
export const databaseConfig = () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

export const redisConfig = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'sms-serve:',
});
