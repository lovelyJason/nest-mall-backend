import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { WxService } from 'src/wx/wx.service';
import * as dayjs from 'dayjs'
// 在api请求过来时，比如进入到service里，如果遇到一些语法错误，则会进入到这里来
@Catch()
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  constructor(
    private readonly wxService: WxService
  ) {}
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
    exception instanceof HttpException
      ? exception.getStatus() // 考虑到exception有可能是new Error抛出的呀一些信息
      : HttpStatus.INTERNAL_SERVER_ERROR;
    console.log('全局 HttpException 异常日志： %s %s error: %s', request.method, request.url, exception.message);

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
    response
      .status(status)
      .json({ 
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
  }
}