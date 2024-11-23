//不分异常类型

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WxService } from 'src/wx/wx.service';
import * as dayjs from 'dayjs'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly wxService: WxService
  ) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionStr = exception
      ? `message:${exception['message']},stack:${exception['stack']}`
      : '';

    console.log(
      '全局异常日志： %s %s %s error: %s',
      request.method,
      request.url,
      request.body,
      exceptionStr,
    );
    const body = {
      statusCode: status,
      timestamp: dayjs(new Date().getTime()).format('YYYY-MM-DD HH:mm:ss'),
      message: exception['message'],
      method: request.method,
      path: request.url,
    }
    this.wxService.sendMessageToQiyeWeixin({
      msgType: 'error',
      data: body
    })

    response.status(status).json(body);
  }
}
