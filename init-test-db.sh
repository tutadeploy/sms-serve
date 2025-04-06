#!/bin/bash
set -e

# 等待MySQL服务启动
until mysql -u"root" -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1"; do
    echo >&2 "MySQL is unavailable - sleeping"
    sleep 1
done

echo >&2 "MySQL is up - executing commands"

# 创建测试数据库
mysql -u"root" -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS sms_serve_test_db;"

# 将schema.sql导入到测试数据库
mysql -u"root" -p"$MYSQL_ROOT_PASSWORD" sms_serve_test_db </docker-entrypoint-initdb.d/01-schema.sql

# 授予用户权限
mysql -u"root" -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON sms_serve_test_db.* TO '$MYSQL_USER'@'%';"
mysql -u"root" -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"
