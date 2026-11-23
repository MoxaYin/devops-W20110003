# AWS Lab 7 - 202383890035

## 1. 实验范围

本实验在 `us-east-1` 完成并验证了以下内容：

- 自定义 VPC、三个跨可用区公网子网和安全组
- Node.js 应用部署、AMI 与 Launch Template
- Application Load Balancer 与 Target Group
- Auto Scaling Group 和 Simple Scaling
- 多实例流量分配、实例请求日志
- CloudWatch 四项自定义指标与 cron 定时采集
- HTTP 80、HTTPS 443、自签名证书和 ACM
- MongoDB 8.0 与 Playtime 应用

## 2. 提交文件

```text
lab-07/
├─ README.md
├─ app.js
├─ mem.sh
├─ user-data.sh
├─ load-test.sh
├─ config/
│  ├─ mongodb-org-8.0.repo
│  └─ playtime.env.example
├─ 202383890035_Lab7_实验报告.pdf
└─ screenshots/
```

`node_modules`、AWS 访问密钥、Secret Key、会话令牌、SSH 私钥和真实密码不进入仓库。

## 3. 环境与资源

| 项目 | 配置 |
|---|---|
| 区域 | `us-east-1` |
| VPC | `vpc-0c9e49680bc94caad` |
| 公网子网 | `us-east-1a`、`us-east-1b`、`us-east-1c` |
| ALB | `ass2` |
| ALB DNS | `ass2-300501346.us-east-1.elb.amazonaws.com` |
| Target Group | `ass2-node-tg`，HTTP 3000 |
| Auto Scaling Group | `ass2-asg`，Desired 2，Min 2，Max 3 |
| 应用实例 | `i-06a95e9be8bdd30c0`、`i-0acd1a295dd51e32f` |
| IAM Instance Profile | `LabInstanceProfile` |
| Node 应用端口 | 3000 |
| Playtime 实验端口 | 3001，避免与现有应用冲突 |
| MongoDB | 8.0.38，`127.0.0.1:27017` |

## 4. Node.js 应用

```bash
cd /home/ec2-user
node app.js
curl -i http://localhost:3000/
```

应用返回后端主机名，并将请求记录到：

```text
/home/ec2-user/requests.log
```

Launch Template 的 User Data：

```bash
#!/bin/bash
su - ec2-user -c 'cd /home/ec2-user && nohup node app.js > app.out 2>&1 &'
```

## 5. ALB、ASG 和负载测试

Target Group：

```text
Instance / HTTP 3000 / health check path /
```

ALB 使用三个公网子网，HTTP 80 与 HTTPS 443 均转发到 `ass2-node-tg`。

ASG 使用 Simple Scaling：

```text
Average CPUUtilization >= 50% for 2 periods of 60 seconds
Action: Add 1 capacity unit
Cooldown: 300 seconds
```

未使用 Target Tracking。

100 次请求负载测试：

```bash
./load-test.sh ass2-300501346.us-east-1.elb.amazonaws.com
```

结果：

```text
50 Server: ip-10-0-19-114.ec2.internal
50 Server: ip-10-0-42-215.ec2.internal
```

## 6. CloudWatch Custom Metrics

依赖：

```bash
sudo yum install -y net-tools sysstat cronie
sudo systemctl enable crond
sudo systemctl start crond
chmod +x /home/ec2-user/mem.sh
```

命名空间与指标：

```text
Namespace: Custom
Dimension: Instance
Metrics:
  memory-usage
  Tcp_connections
  TCP_connection_on_port_80
  IO_WAIT
```

有效定时任务：

```text
PATH=/usr/local/bin:/usr/bin:/bin
*/1 * * * * /home/ec2-user/mem.sh
```

实际结果：

```text
crond: active
```

## 7. HTTPS 与 ACM

- 自签名证书 Common Name 与 ALB DNS 完全一致。
- ALB 配置 HTTP 80 和 HTTPS 443。
- 443 使用 ACM 导入证书。
- ACM 状态为 Issued、Type Imported、In use Yes。
- 不受信任证书警告属于自签名实验的预期行为。

## 8. MongoDB 与 Playtime

仓库配置位于 `config/mongodb-org-8.0.repo`。

```bash
sudo cp config/mongodb-org-8.0.repo /etc/yum.repos.d/mongodb-org-8.0.repo
sudo yum install -y mongodb-org
sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager
sudo ss -lntp | grep 27017
```

实测结果：

```text
mongod.service: active (running)
LISTEN 127.0.0.1:27017
MongoDB 8.0.38
```

Playtime 部署：

```bash
cd /home/ec2-user
git clone https://github.com/wit-hdip-comp-sci-2022/playtime.git
cd playtime
npm install
PORT=3001 npm run start
```

验证：

```bash
curl -i http://127.0.0.1:3001
```

浏览器地址：

```text
http://<EC2-public-ip>:3001
```

浏览器成功显示 Playtime 的 Log in 与 Sign up 页面，进程和端口证据见截图索引。

## 9. 截图索引

| 文件 | 证据 |
|---|---|
| `01-subnet-us-east-1a.png` | 子网 1 和公网路由 |
| `02-subnet-us-east-1b.png` | 子网 2 |
| `03-subnet-us-east-1c.png` | 子网 3 |
| `04-alb-security-group.png` | ALB 80/443 |
| `05-app-security-group.png` | SSH 与 3000 |
| `06-node-local-test.png` | Node 本地 HTTP 200 |
| `07-node-browser-test.png` | Hello World 页面 |
| `08-custom-ami.png` | AMI |
| `09-launch-template.png` | Launch Template |
| `10-launch-template-userdata.png` | IAM 角色和 User Data |
| `11-load-balancer.png` | ALB 与三 AZ |
| `12-auto-scaling-group.png` | ASG 配置 |
| `13-simple-scaling-policy.png` | Simple Scaling |
| `14-target-group-healthy.png` | 两个健康目标 |
| `15-asg-instance-lifecycle.png` | ASG 实例状态 |
| `16-alb-response.png` | ALB 后端响应 |
| `17-load-test-50-50.png` | 100 次请求 50/50 |
| `18-target-1-request-log.png` | 实例 1 日志 50 条 |
| `19-target-2-request-log.png` | 实例 2 日志 50 条 |
| `20-cloudwatch-metrics-cli.png` | 四项指标 CLI 输出 |
| `21-cloudwatch-metrics-graph.png` | CloudWatch 时间序列 |
| `22-cloudwatch-instance-dimension.png` | Instance 维度 |
| `23-https-application.png` | HTTPS 页面 |
| `24-http-https-listeners.png` | 80/443 监听器 |
| `25-self-signed-curl.png` | TLS 自签名验证 |
| `26-browser-certificate.png` | 证书 Common Name |
| `27-acm-certificate.png` | ACM 状态 |
| `28-crontab.png` | cron 有效任务 |
| `29-mongodb-service.png` | Mongo 服务与 27017 |
| `30-mongodb-port-process.png` | Node、3001 与 Mongo 运行 |
| `31-playtime-home.png` | Playtime 浏览器页面 |

## 10. 会话与 Sticky Sessions

Playtime 使用 cookie 会话。若将 Playtime 接入 ALB 并要求保持登录会话，应对其 Target Group 启用 Group-level stickiness。本仓库当前的 Playtime 验证使用 EC2 公网 IP 的 3001 端口直接访问，因此无需依赖 ALB 粘性会话。
