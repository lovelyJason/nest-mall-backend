import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
// import { HttpExceptionFilter } from './filters/http-exception.filter';
// import { AllExceptionsFilter } from './filters/all-exception.filter';

const IS_DEN = process.env.NODE_ENV !== 'production'

async function bootstrap() {
  const logger: Logger = new Logger('main.ts')
  const app = await NestFactory.create(AppModule, {
    logger: IS_DEN ? ['log', 'debug', 'error', 'warn'] : ['error', 'warn']
  });
  app.setGlobalPrefix('api/v1'); // 全局路由前缀
  // 全局中间件
  // app.use((req, res, next) => {
  //   if(req.readable) {
  //     const buffer = []
  //     req.on('data', buff => {
  //       buffer.push(buff)
  //     })
  //     req.on('end',() => {
  //       const crt = Buffer.concat(buffer).toString('utf-8')
  //       const data = JSON5.parse(crt)
  //       console.log(data)
  //     })
  //   }
  //   next()
  // })
  // app.useGlobalFilters(new HttpExceptionFilter(),new AllExceptionsFilter())
  app.use(helmet());
  // 每个IP每10分钟最多300个请求
  app.use(rateLimit({
    windowMs: 1000 * 60 * 10,
    max: 300
  }));
  await app.listen(7002);
  logger.log('Your application is running on http://127.0.0.1:7002');
}
bootstrap();
