// src/data-source.ts
import 'reflect-metadata'; // TypeORM所需
import { DataSource } from 'typeorm';
import { getTypeOrmDataSourceOptions } from './common/config/typeorm.config';

// 使用统一的配置
export const AppDataSourceOptions = getTypeOrmDataSourceOptions();
export const AppDataSource = new DataSource(AppDataSourceOptions);
