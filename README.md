
## Description

一个用Nest.js实现的简单的接口

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## deploy

node版本14.20.0

```bash
pm2 start npm --interpreter  ~/.nvm/versions/node/v14.20.0/bin/node --name nest-mall-backend -- run start:prod
pm2 start pm2.json
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## 其他问题


nestjs对body的解析也依赖于body-parser,不支持JSON5.我试了nestjs管道， 请求拦截器， 都是无效，如果是JSON5格式的，直接会报错不会进入管道或拦截器中。同时nest.js内部的web服务器默认是express。express只支持这几种请求方式

application/json
application/x-www-form-urlencoded
multipart/form-data

也就是说你想传递别的一些数据，比如xml，比如JSON5，没辙。express获取请求数据是调用req.on，监听data，拼接buffer

```typescript
@Post('userxml')
getUserXML(@Request() req): string {
  // @Request()获取express原生请求体，监听data方法拿到req数据
  req.on('data', reqs => {
    console.log(reqs);
  })
  return '222';
}
```

包括egg.js, nestjs。这东西不光有上面的致命缺陷，也不支持content-type为application/json;charset=utf-8;

此时就可以很方便的自定义对数据进行处理，如处理xml就自行调用xml2js。当请求参数传递的是不带引号的JSON5格式，application/json5的请求也会直接报错，进不到这里来

- mac下会安装fsevents的包，这个包在linux下不需要, npm i -f
- 此项目有双问号特性， 需要保持nodejs较高版本，目前16.0.0运行在服务端没有问题
- nestjs的log不能输出到文件里，需要借用node的winston包
  1. install
  ```bash
  npm install winston winston-daily-rotate-file
  ```
  2. 在 app.module.ts 中引入 winston 模块，并将其注入给 LoggerService：

  3. 在controller和service中通过实例方法调用
  ```typescript
    import { Controller, Get } from '@nestjs/common';
    import { Logger } from 'nestjs-winston';
    @Controller()
    export class AppController {
      private readonly logger: Logger;
      constructor(private readonly loggerService: LoggerService) {
        this.logger = new Logger(AppController.name, true, false);
      }
      @Get()
      async getHello(): Promise<string> {
        this.logger.log('Hello world!');
        return 'Hello World!';
      }
    }
  ```

  4. 启动应用后，在根目录下会生成 logs/ 目录，其中会按照日期命名的文件存储日志信息。一般会配置日志文件的保存时间和大小限制，避免日志文件过大影响性能。

- 但是最新班的nest-winston不支持nestjs v10，考虑nestjs-pino.pino会默认打印出日志，带有请求参数的信息
- 配合pino-pretty实现美化

## 数据库被锁，无法重启

找到/var/lib/mongo目录，删除mongod.lock

```bash
# 修复
/usr/bin/mongod -f /etc/mongod.conf --repair
# 启动
/usr/bin/mongod -f /etc/mongod.conf
# 查看进程是否运行
ps aux | grep mongo
```

## docker安装mongodb

```bash
docker pull mongo
# 创建持久化目录
mkdir -p /docker_volume/mongodb/data

docker run --name mymongo -v /docker_volume/mongodb/data:/data/db -p 27017:27017 -d mongo --auth

```


db.createUser({user: 'jasonhuang', pwd: 'GbEd9cuLP3b9BXES', roles: [{ role:'userAdminAnyDatabase', db: 'admin'},"readWriteAnyDatabase"]});
db.auth("jasonhuang", "GbEd9cuLP3b9BXES")

use mall
db.createUser({user: 'jason', pwd: 'GbEd9cuLP3b9BXES', roles: [{role: 'dbOwner', db: 'mall'}]});

## 清理空间

```bash
# 列出整个系统中最大的20个文件或目录
sudo du -ah / | sort -hr | head -n 20
# 删除/var/log目录下30天前的所有文件
sudo find /var/log -type f -mtime +30 -delete
cat null > ./pm2__2023-06-23_23-50-17.log
```

## 日志

```
pm2 install pm2-logrotate
```

max_size （默认10M）: 当一个文件的大小超过这个值时，它将会对其进行分割。你可以在最后指定单位:10G, 10M, 10K
retain（默认为30个文件日志）：保留日志文件数量
compress（默认false）：是否启用压缩处理所有的旋转日志
dateFormat（默认格式YYYY-MM-DD_HH-mm-ss）：日志文件名称格式
rotateModule（默认true）：像其他应用程序一样旋转pm2模块的日志
workerInterval（默认30秒）：检查日志大小的时间间隔
rotateInterval（默认每天午夜0 0 * * *）：定时执行旋转
TZ（默认系统时间）：偏移保存日志文件的标准tz数据库时区

重启服务是没效的，需要删除服务再重新启动

## 数据库说明

### 备份说明

mongodump命令脚本语法如下：

mongodump -h dbhost -d dbname -o dbdirectory
-h：
MongDB所在服务器地址，例如：127.0.0.1，当然也可以指定端口号：127.0.0.1:27017

-d：
需要备份的数据库实例，例如：test

-o：
备份的数据存放位置，例如：c:\data\dump，当然该目录需要提前建立，在备份完成后，系统自动在dump目录下建立一个test目录，这个目录里面存放该数据库实例的备份数据。

-u, -p: 带auth认证的账号密码

–authenticationMechanism： 指定认证的数据库

本mognodb运行在docker中， 如果需要做备份

```bash
# 1.使用mongodump备份，先进入容器内
# <!-- // 示例，将本地test1数据库的数据备份到D:\Java\mongo_dump文件夹下面 -->
mongodump -h 127.0.0.1 -d test1 -o D:\Java\mongo_dump -u testAdmin -p 123456

# 2. 将备份文件从容器拷贝到宿主机
# 从容器内先退出进入宿主机
docker cp mymongo:/backup /root/backup

```

导入备份

navicat没有集成mongodup和mongorestore这两个命令， 导入备份需要使用到
```bash
mongorestore --db your_database_name /path/to/backup/directory
```

/path/to/backup/directory是数据库所有的bson备份文件所在的路径
