// 验证码响应接口
export interface CaptchaResult {
  repCode: string;
  repMsg: string;
  repData?: CaptchaResultData;
}

// 滑动拼图验证码数据
export interface BlockPuzzleCaptchaData {
  originalImageBase64: string; // 背景图片
  jigsawImageBase64: string; // 滑块图片
  token: string; // 验证码会话token
  secretKey?: string; // AES加密密钥(可选)
}

// 点选文字验证码数据
export interface ClickWordCaptchaData {
  originalImageBase64: string; // 背景图片
  wordList: string[]; // 需要点击的文字列表
  token: string; // 验证码会话token
  secretKey?: string; // AES加密密钥(可选)
}

// 验证码数据联合类型
export type CaptchaResultData = BlockPuzzleCaptchaData | ClickWordCaptchaData;

// 导入CaptchaType枚举
import { CaptchaType } from '../dto/get-captcha.dto';

// 验证码会话存储结构
export interface CaptchaSession {
  token: string; // 验证码token
  captchaType: CaptchaType; // 验证码类型
  correctPosition: any; // 正确位置信息
  secretKey?: string; // 加密密钥
  expireTime: number; // 过期时间戳
  used: boolean; // 是否已使用
}

// 坐标点接口
export interface Point {
  x: number;
  y: number;
}
