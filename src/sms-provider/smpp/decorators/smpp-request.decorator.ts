import { AxiosHeaders } from 'axios';
import * as crypto from 'crypto';

export function generateSmppSign(
  apiKey: string,
  apiSecret: string,
  timestamp: number,
): string {
  const signStr = `${apiKey}${apiSecret}${timestamp}`;
  return crypto.createHash('md5').update(signStr).digest('hex');
}

export function getSmppHeaders(
  apiKey: string,
  apiSecret: string,
): AxiosHeaders {
  const timestamp = Math.floor(Date.now() / 1000);
  // SMPP API文档中通常不要求nonce，Buka的实现可能是一个通用实践或特定要求
  // 此处暂时不包含nonce，如果后续发现需要，再进行添加。
  // const nonce = crypto.randomBytes(16).toString('hex');

  // 根据您提供的文档，以及通用的API设计，签名通常是基于特定参数组合后进行哈希
  // 这里我们假设签名仍然是 apiKey + apiSecret + timestamp 的MD5哈希，如Buka一样
  // 如果SMPP服务有特定的签名方式，请告知，我会进行调整
  const sign = generateSmppSign(apiKey, apiSecret, timestamp);

  const headers = new AxiosHeaders();
  headers.set('Content-Type', 'application/json;charset=UTF-8');
  // 根据您的API文档截图，头部参数名似乎是 `Api-Key`, `Sign`, `Timestamp`
  // 而Buka中使用的是 `X-Api-Key`, `X-Timestamp`, `X-Nonce`, `X-Signature`
  // 这里我们遵循您提供的SMPP API文档中的参数名
  headers.set('Api-Key', apiKey);
  headers.set('Sign', sign);
  headers.set('Timestamp', timestamp.toString());

  // 如果有其他必要的头部，如 `appId`，也应在此处添加或在请求体中包含

  return headers;
}
