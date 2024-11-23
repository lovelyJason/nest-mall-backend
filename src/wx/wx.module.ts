import { Module } from '@nestjs/common';
import { WxService } from './wx.service';
import { WxController } from './wx.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { WxSchema } from 'src/schema/wx.schema';
import { ApifactoryModule } from 'src/apifactory/apifactory.module';

const WxTable = MongooseModule.forFeature([{ schema: WxSchema, name: 'Wxs' }])

@Module({
  imports: [WxTable, HttpModule, ApifactoryModule],
  controllers: [WxController],
  providers: [WxService],
  exports: [WxService]
})
export class WxModule {}
