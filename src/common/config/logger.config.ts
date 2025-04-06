import { LogLevel } from '@nestjs/common';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import * as fs from 'fs';

/**
 * 获取NestJS日志配置
 * @returns 日志配置选项
 */
export const getLoggerConfig = (): LogLevel[] => {
  // 根据环境设置日志级别
  const logLevel: LogLevel[] =
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : process.env.NODE_ENV === 'test'
        ? ['error']
        : ['error', 'warn', 'log', 'debug', 'verbose'];

  return logLevel;
};

/**
 * 获取Winston日志配置
 * @param appName 应用名称
 * @returns Winston日志配置
 */
export const getWinstonLoggerConfig = (
  appName: string,
): winston.LoggerOptions => {
  // 生成日志文件路径
  const logsDir = join(process.cwd(), 'logs');

  // 确保日志目录存在
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // 日志格式 - 控制台使用彩色格式
  const consoleFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    nestWinstonModuleUtilities.format.nestLike(appName, {
      colors: true,
      prettyPrint: true,
    }),
  );

  // 日志格式 - 文件使用JSON格式，便于后续分析
  const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    winston.format.json(),
  );

  // 构建日志配置
  return {
    transports: [
      // 控制台日志 - 开发环境信息丰富
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      }),

      // 错误日志文件 - 仅记录错误
      new winston.transports.File({
        filename: join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),

      // 综合日志文件 - 记录所有级别
      new winston.transports.File({
        filename: join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
    ],
  };
};
