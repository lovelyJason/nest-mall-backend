import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import type { AxiosRequestConfig } from 'axios'
import {
  AxiosInterceptor,
  AxiosFulfilledInterceptor,
  AxiosRejectedInterceptor,
  AxiosResponseCustomConfig,
} from '@narando/nest-axios-interceptor'
import { WxService } from 'src/wx/wx.service'
import { substrUrlExceptDomain } from 'src/utils/function'

const LOGGING_CONFIG_KEY = Symbol('LoggingAxiosInterceptor')

// Merging our custom properties with the base config
interface LoggingConfig extends AxiosRequestConfig {
  [LOGGING_CONFIG_KEY]: {
    startTime: number
  }
}

@Injectable()
export class LoggingAxiosInterceptor extends AxiosInterceptor<LoggingConfig> {
  constructor(
    httpService: HttpService,
    private readonly wxService: WxService
  ) {
    super(httpService)
  }

  requestFulfilled(): AxiosFulfilledInterceptor<LoggingConfig> {
    return (config) => {
      config[LOGGING_CONFIG_KEY] = {
        startTime: Date.now(),
      }
      return config
    }
  }
  // requestRejected(): AxiosRejectedInterceptor {}
  responseFulfilled(): AxiosFulfilledInterceptor<
    AxiosResponseCustomConfig<LoggingConfig>
  > {
    return (res) => {
      const startTime = res.config[LOGGING_CONFIG_KEY].startTime
      const endTime = Date.now()
      const duration = endTime - startTime
      const log = `axios调用接口路由:${res.config.url};请求时间: ${duration}ms`
      // console.log(log)
      if (!res.config.url.includes('weixin') && !res.config.url.includes('91haoka.cn')) {
        if (res.data.code !== 0 && res.data.errcode !== 0) {
          console.log('loggingaxios出错了', res.data)
          // 注意，wxService返回的errcode为0，如果根据code判断会被此处拦截从而死循环，一直发送消息；切记，不要出现死循环
          this.wxService.sendMessageToQiyeWeixin({
            msgType: 'axiosUnusual',
            data: {
              url: substrUrlExceptDomain(res.config.url),
              method: res.config.method,
              payload: res.config.data,
              response: res.data
            }
          })
        }
      }
      return res
    }
  }
}