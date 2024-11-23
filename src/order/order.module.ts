import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from 'src/schema/order.schema';
import { HttpModule } from '@nestjs/axios';
import { ApifactoryModule } from 'src/apifactory/apifactory.module';
import { WxModule } from 'src/wx/wx.module';

const orderTable = MongooseModule.forFeature([{ schema: OrderSchema, name: 'Orders' }])

@Module({
  imports: [orderTable, HttpModule, ApifactoryModule, WxModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService]

})
export class OrderModule {}
