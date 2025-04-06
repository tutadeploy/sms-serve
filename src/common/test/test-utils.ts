/**
 * 测试辅助工具
 * 提供创建Mock对象和常用测试数据的函数
 */

/**
 * MockRepository 类型
 * 用于模拟 TypeORM Repository
 */
export type MockRepository = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  findOneById: jest.Mock;
  find: jest.Mock;
  findBy: jest.Mock;
  delete: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
};

/**
 * 创建 Mock Repository
 * @returns 模拟的 Repository 对象
 */
export const createMockRepository = (): MockRepository => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findOneById: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
    execute: jest.fn(),
  })),
});

/**
 * 创建 Mock QueryRunner
 * 用于模拟事务测试
 * @returns 模拟的 QueryRunner 对象
 */
export const createMockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  },
});

/**
 * 创建 Mock EntityManager
 * @returns 模拟的 EntityManager 对象
 */
export const createMockEntityManager = () => ({
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  transaction: jest.fn(),
  createQueryRunner: jest.fn().mockReturnValue(createMockQueryRunner()),
});
