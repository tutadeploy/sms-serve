-- 检查admin用户是否已存在
SET @admin_exists = (SELECT COUNT(*)
FROM users
WHERE username = 'admin');

-- 如果不存在，则创建admin用户
-- 使用bcrypt加密的密码 'admin123'
SET @admin_password_hash = '$2b$10$6u2ArhK5UGBlaSwMjYfpaeqN.xPu5JgWFXh5PqL9OsOlxBb/MO1Na';

-- 创建用户
INSERT INTO users
    (username, password_hash, email, role, is_active)
SELECT 'admin', @admin_password_hash, 'admin@example.com', 'admin', 1
WHERE @admin_exists = 0;

-- 输出结果
SELECT
    CASE 
        WHEN @admin_exists > 0 THEN '管理员用户已存在' 
        WHEN ROW_COUNT() > 0 THEN '管理员用户创建成功' 
        ELSE '管理员用户创建失败' 
    END AS result; 