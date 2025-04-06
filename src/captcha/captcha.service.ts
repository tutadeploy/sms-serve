import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import * as svgCaptcha from 'svg-captcha';
import { CaptchaType } from './dto';
import {
  BlockPuzzleCaptchaData,
  CaptchaResult,
  CaptchaSession,
  ClickWordCaptchaData,
  Point,
} from './interfaces';
import * as path from 'path';
import * as fs from 'fs';

// 引入node-puzzle
import createPuzzle from 'node-puzzle';

// 使用一个常量前缀来标识Redis中的验证码会话
const CAPTCHA_PREFIX = 'captcha:session:';

// Redis配置接口
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly redisClient: Redis;

  // 验证码过期时间(秒)
  private readonly captchaExpire = 60 * 2; // 2分钟

  // 验证码容错率(像素)
  private readonly slideTolerance = 250; // 增加容错范围为250像素
  private readonly clickTolerance = 15;

  // 前端期望的图片比例常量
  private readonly BACKGROUND_WIDTH = 310; // 前端期望的背景图宽度
  private readonly BLOCK_WIDTH = 47; // 前端期望的滑块宽度

  constructor(private readonly configService: ConfigService) {
    // 读取Redis配置并创建客户端连接
    const redisConfig = this.configService.get<RedisConfig>('redis');

    if (!redisConfig) {
      throw new Error('Redis配置不存在');
    }

    this.redisClient = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
    });

    this.logger.log('验证码服务初始化完成');
  }

  /**
   * 生成验证码
   */
  async generateCaptcha(captchaType: CaptchaType): Promise<CaptchaResult> {
    try {
      // 根据验证码类型生成不同的验证码
      if (captchaType === CaptchaType.BLOCK_PUZZLE) {
        return this.generateBlockPuzzleCaptcha();
      } else if (captchaType === CaptchaType.CLICK_WORD) {
        return this.generateClickWordCaptcha();
      } else {
        return {
          repCode: '6111',
          repMsg: '不支持的验证码类型',
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`生成验证码出错: ${errorMessage}`);
      return {
        repCode: '6112',
        repMsg: '生成验证码失败',
      };
    }
  }

  /**
   * 生成滑动拼图验证码
   */
  private async generateBlockPuzzleCaptcha(): Promise<CaptchaResult> {
    try {
      // 直接使用crypto.randomUUID()生成安全的UUID
      const token = crypto.randomUUID();
      const secretKey: string = crypto.randomBytes(16).toString('hex');

      // 使用内置的默认图片路径
      const imagePath = path.join(process.cwd(), 'assets/captcha/default.jpg');

      // 检查文件是否存在
      if (!fs.existsSync(imagePath)) {
        throw new Error(`验证码图片不存在: ${imagePath}`);
      }

      // 使用node-puzzle库生成滑动拼图验证码
      // 确保滑块宽度与前端期望的比例一致
      const captchaData = await createPuzzle(imagePath, {
        width: this.BLOCK_WIDTH, // 设置滑块宽度为47像素，与前端计算匹配
        bgWidth: this.BACKGROUND_WIDTH, // 设置背景图宽度为310像素，与前端计算匹配
        height: this.BLOCK_WIDTH, // 保持滑块为正方形
      });

      // 将Buffer转换为Base64
      const background = `data:image/jpeg;base64,${captchaData.bg.toString('base64')}`;
      const block = `data:image/png;base64,${captchaData.puzzle.toString('base64')}`;

      // 获取正确的滑动位置
      const correctPosition: Point = { x: captchaData.x, y: captchaData.y };

      // 构建响应数据
      const repData: BlockPuzzleCaptchaData = {
        originalImageBase64: background,
        jigsawImageBase64: block,
        token: token,
        secretKey: secretKey,
      };

      // 保存验证码会话信息到Redis
      const captchaSession: CaptchaSession = {
        token: token,
        captchaType: CaptchaType.BLOCK_PUZZLE,
        correctPosition,
        secretKey: secretKey,
        expireTime: Math.floor(Date.now() / 1000) + this.captchaExpire,
        used: false,
      };

      await this.redisClient.set(
        `${CAPTCHA_PREFIX}${token}`,
        JSON.stringify(captchaSession),
        'EX',
        this.captchaExpire,
      );

      return {
        repCode: '0000',
        repMsg: 'success',
        repData,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`生成滑动验证码失败: ${errorMessage}`);
      return {
        repCode: '6113',
        repMsg: `生成验证码失败: ${errorMessage}`,
      };
    }
  }

  /**
   * 生成点选文字验证码
   */
  private async generateClickWordCaptcha(): Promise<CaptchaResult> {
    try {
      // 直接使用crypto.randomUUID()生成安全的UUID
      const token = crypto.randomUUID();
      const secretKey: string = crypto.randomBytes(16).toString('hex');

      // 生成随机的文字
      const words = this.generateRandomWords();
      const wordPositions: Point[] = [];

      // 生成点选文字验证码
      const captcha = svgCaptcha.create({
        size: 4,
        ignoreChars: '0o1il',
        noise: 5,
        color: true,
        background: '#f5f5f5',
        width: 300,
        height: 150,
      });

      // 将SVG转换为Base64
      const svgBase64 = `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`;

      // 随机生成字符位置(这里简化处理，实际需要基于SVG解析真实位置)
      for (let i = 0; i < words.length; i++) {
        wordPositions.push({
          x: 50 + i * 60 + Math.random() * 20,
          y: 75 + Math.random() * 20,
        });
      }

      // 构建响应数据
      const repData: ClickWordCaptchaData = {
        originalImageBase64: svgBase64,
        wordList: words,
        token: token,
        secretKey: secretKey,
      };

      // 保存验证码会话信息到Redis
      const captchaSession: CaptchaSession = {
        token: token,
        captchaType: CaptchaType.CLICK_WORD,
        correctPosition: wordPositions,
        secretKey: secretKey,
        expireTime: Math.floor(Date.now() / 1000) + this.captchaExpire,
        used: false,
      };

      await this.redisClient.set(
        `${CAPTCHA_PREFIX}${token}`,
        JSON.stringify(captchaSession),
        'EX',
        this.captchaExpire,
      );

      return {
        repCode: '0000',
        repMsg: 'success',
        repData,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`生成点选文字验证码失败: ${errorMessage}`);
      return {
        repCode: '6114',
        repMsg: `生成验证码失败: ${errorMessage}`,
      };
    }
  }

  /**
   * 生成随机文字列表
   */
  private generateRandomWords(): string[] {
    const wordPool =
      '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严首底液官德调随病苏失尔死讲配女黄推显谈罪神艺呢席含企望密批营项防举球英氧势告李台落木帮轮破亚师围注远字材排供河态封另施减树溶怎止案言士均武固叶鱼波视仅费紧爱左章早朝害续轻服试食充兵源判护司足某练差致板田降黑犯负击范继兴似余坚曲输修的故城夫够送笑船占右财吃富春职觉汉画仍委科百货做帮';
    const wordCount = Math.floor(Math.random() * 2) + 3; // 3-4个文字
    const result: string[] = [];

    for (let i = 0; i < wordCount; i++) {
      const randomIndex = Math.floor(Math.random() * wordPool.length);
      result.push(wordPool[randomIndex]);
    }

    return result;
  }

  /**
   * 验证验证码
   */
  async verifyCaptcha(
    captchaType: CaptchaType,
    token: string,
    pointJson: string,
  ): Promise<CaptchaResult> {
    try {
      // 从Redis获取验证码会话
      const sessionData = await this.redisClient.get(
        `${CAPTCHA_PREFIX}${token}`,
      );

      if (!sessionData) {
        return {
          repCode: '6201',
          repMsg: '验证码已过期或不存在',
        };
      }

      const session = JSON.parse(sessionData) as CaptchaSession;

      // 检查验证码是否已使用
      if (session.used) {
        return {
          repCode: '6202',
          repMsg: '验证码已使用',
        };
      }

      // 检查验证码类型是否匹配
      if (session.captchaType !== captchaType) {
        return {
          repCode: '6203',
          repMsg: '验证码类型不匹配',
        };
      }

      // 验证验证码
      let verifyResult = false;

      if (captchaType === CaptchaType.BLOCK_PUZZLE) {
        verifyResult = this.verifyBlockPuzzleCaptcha(pointJson, session);
      } else if (captchaType === CaptchaType.CLICK_WORD) {
        verifyResult = this.verifyClickWordCaptcha(pointJson, session);
      }

      if (verifyResult) {
        // 标记验证码为已使用
        session.used = true;
        await this.redisClient.set(
          `${CAPTCHA_PREFIX}${token}`,
          JSON.stringify(session),
          'EX',
          60, // 验证成功后保留1分钟，便于后续验证流程
        );

        return {
          repCode: '0000',
          repMsg: 'success',
        };
      } else {
        return {
          repCode: '6204',
          repMsg: '验证码验证失败',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`验证验证码出错: ${errorMessage}`);
      return {
        repCode: '6205',
        repMsg: '验证过程发生错误',
      };
    }
  }

  /**
   * 验证滑动拼图验证码
   */
  private verifyBlockPuzzleCaptcha(
    pointJson: string,
    session: CaptchaSession,
  ): boolean {
    try {
      // 尝试各种可能的格式解析
      let userPoint: Point;

      try {
        // 尝试直接解析为JSON
        userPoint = JSON.parse(pointJson) as Point;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        try {
          // 尝试解析Base64编码
          const decoded = Buffer.from(pointJson, 'base64').toString('utf-8');
          userPoint = JSON.parse(decoded) as Point;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // 如果上述方法都失败，则尝试按照固定格式解析
          // 假设前端传入的可能是类似 "x,y" 格式
          const parts = pointJson.split(',');
          if (parts.length >= 2) {
            userPoint = {
              x: parseFloat(parts[0]),
              y: parseFloat(parts[1]),
            };
          } else {
            // 最后兜底方案，直接提取数字
            const numbers = pointJson.match(/\d+(\.\d+)?/g);
            if (numbers && numbers.length >= 1) {
              userPoint = {
                x: parseFloat(numbers[0]),
                y: numbers.length > 1 ? parseFloat(numbers[1]) : 0,
              };
            } else {
              throw new Error('无法解析坐标数据');
            }
          }
        }
      }

      // 获取正确的坐标
      const correctPoint = session.correctPosition as Point;

      // 计算x坐标差距，允许一定的误差范围
      const xDiff = Math.abs(userPoint.x - correctPoint.x);

      this.logger.log(
        `验证滑动拼图: 用户坐标(${userPoint.x}, ${userPoint.y}), 正确坐标(${correctPoint.x}, ${correctPoint.y}), 差距: ${xDiff}, 容错: ${this.slideTolerance}`,
      );

      return xDiff <= this.slideTolerance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`验证滑动拼图验证码出错: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 验证点选文字验证码
   */
  private verifyClickWordCaptcha(
    pointJson: string,
    session: CaptchaSession,
  ): boolean {
    try {
      // 尝试各种可能的格式解析
      let userPoints: Point[];

      try {
        // 尝试直接解析为JSON
        userPoints = JSON.parse(pointJson) as Point[];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        try {
          // 尝试解析Base64编码
          const decoded = Buffer.from(pointJson, 'base64').toString('utf-8');
          userPoints = JSON.parse(decoded) as Point[];
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // 如果上述方法都失败，则直接返回失败
          throw new Error('无法解析坐标数据');
        }
      }

      // 获取正确的坐标数组
      const correctPoints = session.correctPosition as Point[];

      // 检查点的数量是否一致
      if (userPoints.length !== correctPoints.length) {
        return false;
      }

      // 验证每个点的位置，允许一定的误差范围
      for (let i = 0; i < userPoints.length; i++) {
        const distance = Math.sqrt(
          Math.pow(userPoints[i].x - correctPoints[i].x, 2) +
            Math.pow(userPoints[i].y - correctPoints[i].y, 2),
        );

        if (distance > this.clickTolerance) {
          return false;
        }
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`验证点选文字验证码出错: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 检查验证码是否通过
   * 用于其他服务验证验证码token
   */
  async checkCaptchaToken(token: string): Promise<boolean> {
    try {
      if (!token) {
        return false;
      }

      // 从Redis获取验证码会话
      const sessionData = await this.redisClient.get(
        `${CAPTCHA_PREFIX}${token}`,
      );

      if (!sessionData) {
        return false;
      }

      const session = JSON.parse(sessionData) as CaptchaSession;

      // 验证码必须是已使用的才表示验证通过
      return session.used === true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`检查验证码token出错: ${errorMessage}`);
      return false;
    }
  }
}
