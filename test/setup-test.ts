// 全局增加测试超时时间
jest.setTimeout(30000);

// 预准备测试数据库, 需要根据实际情况实现
// 例如, 如果使用TypeORM的migrations构建数据库
// 可以在这里调用migration运行命令
// 或者其他初始化步骤
