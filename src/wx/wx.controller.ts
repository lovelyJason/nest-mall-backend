import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, Req, UseFilters } from '@nestjs/common';
import { WxService } from './wx.service';

export interface WxResponse<T = unknown> {
  code: number
  data?: T
  message? : string
  msg?: string
}

@Controller('wx')
export class WxController {
  constructor(private readonly wxService: WxService) {}

  // 根据code获取access_token,重写了apifactory的登录逻辑
  @Get('user')
  async login(@Query() query: any): Promise<WxResponse<any> | any> {
    const { code } = query  // 不再依赖于id，内部通过微信的openid反查id
    return await this.wxService.login(code)
  }
}
