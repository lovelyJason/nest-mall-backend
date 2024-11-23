import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
// import { TypeOrmModule } from '@nestjs/typeorm';  // typeorm对mongodb的版本支持太落后了，故使用@nestjs/mongoose
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { ReceiveModule } from './receive/receive.module';
import { WxModule } from './wx/wx.module';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
// import { ApifactoryModule } from './apifactory/apifactory.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AllExceptionsFilter } from './filters/all-exception.filter';
import mongodbConfig from '../config.js';

const { username, password, host, port, database } = mongodbConfig;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`, // 优先加载本地环境文件
        `.env.${process.env.NODE_ENV}`, // 加载对应环境文件
        '.env', // 加载默认配置
      ],
    }),
    // 这个库有个很操蛋的bug， 密码里有些字符会导致连接失败
    MongooseModule.forRoot(
      `mongodb://${username}:${password}@${host}:${port}/${database}`,
    ),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                },
              }
            : {
                target: 'pino-roll', // 自动每天按照文件滚动的方式滚动出来，超出size会自动生成新日志
                options: {
                  file: join('logs', 'out.log'),
                  frequency: 'daily',
                  mkdir: true,
                  size: '10m',
                },
              },
      },
    }),
    ReceiveModule,
    WxModule, // 这里好像不用引入也可以, 只是其中的代码不会初始化。但是全局异常过滤器中依赖此module
    UserModule,
    OrderModule,
    // ApifactoryModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
