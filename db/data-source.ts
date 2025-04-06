import { DataSource } from 'typeorm';
import { getTypeOrmDataSourceOptions } from '../src/common/config/typeorm.config';

// 创建数据源实例
const AppDataSource = new DataSource(getTypeOrmDataSourceOptions());

export default AppDataSource;
