import { Injectable } from '@nestjs/common';
import { WxService } from './wx/wx.service';

const isDev = process.env.NODE_ENV === 'development'

@Injectable()
export class AppService {
  constructor(
    private readonly wxService: WxService
  ) {
    if (!isDev) {
      this.wxService.sendMessageToQiyeWeixin({
        msgType: 'restarService'
      })
    }
  }
  getHello(): string {
    return 'Hello World!';
  }
}
