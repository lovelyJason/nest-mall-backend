import { Module } from '@nestjs/common';
import { ApifactoryService } from './apifactory.service';
import { HttpModule } from '@nestjs/axios';
import { LoggingAxiosInterceptor } from 'src/interceptors/logging.axios-interceptor';
import { WxService } from 'src/wx/wx.service';

@Module({
  imports: [HttpModule],
  providers: [LoggingAxiosInterceptor, ApifactoryService, WxService],
  exports: [ApifactoryService]
})
export class ApifactoryModule {}
