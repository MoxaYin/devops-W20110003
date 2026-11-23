# AWS Assignment 2 - 202383890035

## 1. 项目概述

本项目在 AWS Academy Learner Lab 的 `us-east-1` 区域部署了一个可负载均衡、可自动伸缩、可监控并支持 HTTPS 的 Node.js Web 应用。

请求路径：

```text
Browser -> Internet Gateway -> Application Load Balancer
        -> Target Group (HTTP 3000) -> EC2 Node.js application
```

## 2. 提交文件

```text
assignment-02/
├─ README.md
├─ app.js
├─ mem.sh
├─ user-data.sh
├─ load-test.sh
├─ 202383890035_Assignment2_实验报告.pdf
└─ screenshots/
```

- `app.js`：实际部署的 Node.js 应用，返回 EC2 主机名并记录请求日志。
- `mem.sh`：将内存、TCP 连接、80 端口连接和 I/O Wait 推送到 CloudWatch。
- `user-data.sh`：Launch Template 使用的启动脚本。
- `load-test.sh`：通过 ALB 发送 100 个请求并统计实例分布。
- `screenshots/`：控制台与终端证据原图。

## 3. AWS 资源

| 项目 | 配置 |
|---|---|
| 区域 | `us-east-1` |
| VPC | `vpc-0c9e49680bc94caad` |
| VPC IPv4 CIDR | `10.0.0.0/16` |
| 公网子网 1 | `subnet-077fb73f320ccb4af`，`10.0.0.0/20`，`us-east-1a` |
| 公网子网 2 | `subnet-09908055ccd3a7af7`，`10.0.16.0/20`，`us-east-1b` |
| 公网子网 3 | `subnet-06ae2f5d4ddad464d`，`10.0.32.0/20`，`us-east-1c` |
| 公网路由表 | `rtb-000ea48dc9cb14643` |
| Internet Gateway | `igw-0dd2d15e259190d08` |
| ALB | `ass2` |
| ALB DNS | `ass2-300501346.us-east-1.elb.amazonaws.com` |
| Target Group | `ass2-node-tg`，HTTP 3000，Instance |
| AMI | `ami-0bd001091ca46e472` |
| Launch Template | `ass2-node-template`，`lt-095d333de25d70aad` |
| IAM Instance Profile | `LabInstanceProfile` |
| Auto Scaling Group | `ass2-asg` |
| 容量 | Desired 2，Minimum 2，Maximum 3 |

## 4. 安全组

### `ass2-alb-sg`

安全组 ID：`sg-0fafc7cc7f2dbf350`

| 类型 | 端口 | 来源 |
|---|---:|---|
| HTTP | 80 | `0.0.0.0/0` |
| HTTPS | 443 | `0.0.0.0/0` |

### `ass2-app-sg`

安全组 ID：`sg-0ba465addcfc6c68b`

| 类型 | 端口 | 来源 |
|---|---:|---|
| SSH | 22 | 管理员公网 IP `/32` |
| Custom TCP | 3000 | `ass2-alb-sg` |

应用端口只允许来自 ALB 安全组。为 Mongo/Playtime 页面测试临时开放的 3001 规则已完成用途，提交版不应保留。

## 5. Node.js 应用

应用监听 3000 端口：

```bash
cd /home/ec2-user
node app.js
```

验证：

```bash
curl -i http://localhost:3000/
```

`app.js` 会向浏览器返回：

```text
Server: <EC2 hostname>
```

并将请求追加到：

```text
/home/ec2-user/requests.log
```

## 6. Launch Template User Data

```bash
#!/bin/bash
su - ec2-user -c 'cd /home/ec2-user && nohup node app.js > app.out 2>&1 &'
```

启动后的实例由 Target Group 自动注册。

## 7. 负载均衡验证

Target Group 使用：

```text
Target type: Instances
Protocol: HTTP
Port: 3000
Health check path: /
Success code: 200
```

ALB 监听 HTTP 80，并转发到 `ass2-node-tg`。创建 HTTPS 监听器后，HTTPS 443 同样转发到该 Target Group。

测试命令：

```bash
./load-test.sh ass2-300501346.us-east-1.elb.amazonaws.com
```

实验结果：

```text
50 Server: ip-10-0-19-114.ec2.internal
50 Server: ip-10-0-42-215.ec2.internal
```

两台实例的 `requests.log` 各记录 50 条测试请求。

## 8. Auto Scaling

ASG 选择三个公网子网，Desired capacity 为 2，范围 2-3。

动态策略使用 **Simple Scaling**：

```text
Metric: Average CPUUtilization
Threshold: >= 50%
Periods: 2 x 60 seconds
Action: Add 1 capacity unit
Cooldown: 300 seconds
```

Assignment 2 明确要求使用 Simple Scaling 或 Step Scaling，本实现未使用 Target Tracking。

## 9. CloudWatch 自定义指标

CloudWatch 配置：

```text
Namespace: Custom
Dimension: Instance=<EC2 instance ID>
Metrics:
  memory-usage
  Tcp_connections
  TCP_connection_on_port_80
  IO_WAIT
```

安装依赖：

```bash
sudo yum install -y net-tools sysstat cronie
sudo systemctl enable crond
sudo systemctl start crond
```

给脚本执行权限：

```bash
chmod +x /home/ec2-user/mem.sh
```

定时任务：

```text
PATH=/usr/local/bin:/usr/bin:/bin
*/1 * * * * /home/ec2-user/mem.sh
```

EC2 使用 `LabInstanceProfile`，AWS CLI 区域为 `us-east-1`。

## 10. HTTPS

- ALB 安全组开放 443。
- 自签名证书 Common Name 为 `ass2-300501346.us-east-1.elb.amazonaws.com`。
- 证书已导入 ACM，Type 为 Imported，In Use 为 Yes。
- ALB 同时配置 HTTP 80 和 HTTPS 443 监听器。
- 自签名证书触发浏览器/curl 不受信任提示属于预期行为。

## 11. 截图索引

| 文件 | 证据 |
|---|---|
| `01-subnet-us-east-1a.png` | 子网、自动公网 IPv4、公网路由 |
| `02-subnet-us-east-1b.png` | 第二个可用区子网 |
| `03-subnet-us-east-1c.png` | 第三个可用区子网 |
| `04-alb-security-group.png` | ALB 80/443 规则 |
| `05-app-security-group.png` | SSH 与 ALB 到应用 3000 |
| `06-node-local-test.png` | Node.js 与 HTTP 200 |
| `07-node-browser-test.png` | localhost:3000 页面 |
| `08-custom-ami.png` | 自定义 AMI |
| `09-launch-template.png` | Launch Template 基本信息 |
| `10-launch-template-userdata.png` | IAM 角色与 User Data |
| `11-load-balancer.png` | ALB、三个可用区、DNS |
| `12-auto-scaling-group.png` | ASG 容量与三个子网 |
| `13-simple-scaling-policy.png` | Simple Scaling 策略 |
| `14-target-group-healthy.png` | HTTP 3000，两个健康目标 |
| `15-asg-instance-lifecycle.png` | 实例替换与健康状态 |
| `16-alb-response.png` | ALB 返回后端主机名 |
| `17-load-test-50-50.png` | 100 次请求 50/50 |
| `18-target-1-request-log.png` | 目标实例 1 记录 50 次 |
| `19-target-2-request-log.png` | 目标实例 2 记录 50 次 |
| `20-cloudwatch-metrics-cli.png` | CLI 列出四项指标 |
| `21-cloudwatch-metrics-graph.png` | 四项指标时间序列 |
| `22-cloudwatch-instance-dimension.png` | Instance 维度指标列表 |
| `23-https-application.png` | HTTPS 访问应用 |
| `24-http-https-listeners.png` | HTTP/HTTPS 双监听器 |
| `25-self-signed-curl.png` | TLS 身份验证结果 |
| `26-browser-certificate.png` | 浏览器证书详情 |
| `27-acm-certificate.png` | ACM 证书状态 |
| `28-crontab.png` | cron 服务与定时任务 |

## 12. 安全说明

仓库不包含 AWS Access Key、Secret Key、会话令牌、SSH 私钥或真实站点密码。`app.js` 与 `mem.sh` 均通过 IAM 角色或运行时元数据获取权限/实例信息。

## 13. MongoDB 说明

Assignment 2 补充说明将数据库实例定义为 optional/additional functionality。本项目主交付不依赖 MongoDB。Lab 7 中的本地 MongoDB 与 Playtime 实验证据单独保存在 `lab-07/` 目录。
