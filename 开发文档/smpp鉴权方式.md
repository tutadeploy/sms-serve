签名生成规则：
// src/auth/auth.service.ts
const stringToSign = `${service.apiKey}${service.apiSecret}${timestamp}`;
const calculatedSignature = createHash('md5')
.update(stringToSign)
.digest('hex')
.toLowerCase();
与Buka文档一致，都是使用 API key + API secret + Timestamp 生成MD5-32位字符串。

这里有一个不一致：
Buka文档使用：Sign, Timestamp, Api-Key
我们的实现使用：x-signature, x-timestamp, x-api-key

时间戳验证
// src/auth/auth.service.ts
const timeDiff = Math.abs(currentTime - timestamp);
if (timeDiff > service.signTolerance) {
throw new UnauthorizedException('Signature expired');
}

数据库设计：
-- docker/postgres/init.sql
sign_type VARCHAR(16) NOT NULL DEFAULT 'md5', -- 签名类型：md5, hmac, rsa
sign_key VARCHAR(256), -- 用于HMAC或RSA签名的密钥
sign_tolerance INTEGER NOT NULL DEFAULT 300, -- 签名时间戳容差（秒）
