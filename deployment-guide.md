# UPF割接方案评审系统部署指南

## 1. 环境准备

### 1.1 服务器要求

- 操作系统：CentOS 7/8 或 Ubuntu 20.04/22.04
- CPU：2核及以上
- 内存：4GB及以上
- 磁盘空间：20GB及以上
- 带宽：5Mbps及以上

### 1.2 软件环境安装

```bash
# 1. 安装 Node.js
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

# 2. 安装 PM2
sudo npm install -g pm2

# 3. 安装 Nginx
sudo yum install -y nginx

# 4. 安装 Git
sudo yum install -y git
```

## 2. 项目部署

### 2.1 代码获取

```bash
# 创建项目目录
mkdir -p /var/www/upf-review
cd /var/www/upf-review

# 克隆项目代码
git clone [项目仓库地址] .

# 安装依赖
npm install
```

### 2.2 环境配置

1. 创建环境变量文件：

```bash
# 创建 .env 文件
touch .env
```

2. 配置环境变量：

```env
# .env 文件内容
HUNYUAN_SECRET_KEY=your_api_key
NODE_ENV=production
PORT=3000
```

### 2.3 项目构建

```bash
# 构建项目
npm run build
```

## 3. Nginx配置

### 3.1 创建Nginx配置文件

```bash
sudo vim /etc/nginx/conf.d/upf-review.conf
```

### 3.2 配置内容

```nginx
server {
    listen 80;
    server_name your_domain.com;  # 替换为您的域名

    # 重定向 HTTP 到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your_domain.com;  # 替换为您的域名

    # SSL 配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 安全相关配置
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # 反向代理配置
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存配置
    location /_next/static {
        alias /var/www/upf-review/.next/static;
        expires 365d;
        access_log off;
    }
}
```

### 3.3 启动Nginx

```bash
# 检查配置
sudo nginx -t

# 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 4. PM2配置

### 4.1 创建PM2配置文件

```bash
# 在项目根目录创建 ecosystem.config.js
touch ecosystem.config.js
```

### 4.2 配置内容

```javascript
module.exports = {
  apps: [{
    name: 'upf-review',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
```

### 4.3 启动应用

```bash
# 使用PM2启动应用
pm2 start ecosystem.config.js --env production

# 保存PM2进程列表
pm2 save

# 设置开机自启
pm2 startup
```

## 5. 安全配置

### 5.1 防火墙配置

```bash
# 开放必要端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 5.2 SSL证书配置

1. 申请SSL证书（推荐使用Let's Encrypt）
2. 将证书文件放置在安全位置
3. 在Nginx配置中引用证书文件

## 6. 监控配置

### 6.1 PM2监控

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs upf-review

# 监控资源使用
pm2 monit
```

### 6.2 系统监控

建议配置以下监控：

1. 服务器资源监控（CPU、内存、磁盘）
2. 应用性能监控
3. 错误日志监控
4. 访问日志分析

## 7. 备份策略

### 7.1 代码备份

```bash
# 创建备份目录
mkdir -p /backup/code

# 备份代码
tar -czf /backup/code/upf-review-$(date +%Y%m%d).tar.gz /var/www/upf-review
```

### 7.2 配置文件备份

```bash
# 备份Nginx配置
cp /etc/nginx/conf.d/upf-review.conf /backup/nginx/

# 备份环境变量
cp /var/www/upf-review/.env /backup/env/
```

## 8. 维护指南

### 8.1 日常维护

1. 定期检查日志
2. 监控系统资源使用情况
3. 定期更新依赖包
4. 定期备份数据

### 8.2 故障处理

1. 检查应用状态：`pm2 status`
2. 查看错误日志：`pm2 logs upf-review`
3. 检查Nginx状态：`systemctl status nginx`
4. 检查系统资源：`top`, `df -h`

## 9. 回滚方案

### 9.1 代码回滚

```bash
# 回滚到指定版本
git reset --hard <commit_id>
npm install
npm run build
pm2 restart upf-review
```

### 9.2 配置回滚

```bash
# 恢复Nginx配置
cp /backup/nginx/upf-review.conf /etc/nginx/conf.d/

# 恢复环境变量
cp /backup/env/.env /var/www/upf-review/

# 重启服务
sudo systemctl restart nginx
pm2 restart upf-review
``` 