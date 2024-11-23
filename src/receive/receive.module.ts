import { Module } from '@nestjs/common';
import { ReceiveController } from './receive.controller';
import { ReceiveService } from './receive.service';
import { UserModule } from 'src/user/user.module';
import { OrderModule } from 'src/order/order.module';
import { WxModule } from 'src/wx/wx.module';
// 引入moose模块和schema
import { MongooseModule } from '@nestjs/mongoose';
import { ReceiveSchema } from 'src/schema/receive.schema';
import { HttpModule } from '@nestjs/axios';

const ReceiveTable = MongooseModule.forFeature([{ schema: ReceiveSchema, name: 'Receives' }])

@Module({
  imports: [ReceiveTable, HttpModule, OrderModule, UserModule, WxModule],
  controllers: [ReceiveController],
  providers: [ReceiveService]
})
export class ReceiveModule {}
