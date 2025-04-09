import { AxiosHeaders } from 'axios';
import * as crypto from 'crypto';

export interface BukaRequestHeaders {
  'Content-Type': string;
  'Api-Key': string;
  Sign: string;
  Timestamp: string;
}

export function generateBukaSign(
  apiKey: string,
  apiSecret: string,
  timestamp: number,
): string {
  const signStr = `${apiKey}${apiSecret}${timestamp}`;
  return crypto.createHash('md5').update(signStr).digest('hex');
}

export function getBukaHeaders(
  apiKey: string,
  apiSecret: string,
): AxiosHeaders {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(`${timestamp}${nonce}${apiKey}`)
    .digest('hex');

  const headers = new AxiosHeaders();
  headers.set('Content-Type', 'application/json');
  headers.set('X-Api-Key', apiKey);
  headers.set('X-Timestamp', timestamp.toString());
  headers.set('X-Nonce', nonce);
  headers.set('X-Signature', signature);

  return headers;
}
