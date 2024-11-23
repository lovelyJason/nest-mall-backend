import { Controller, Get, Post, Put, Delete, Body, Param, Request, Req, UseFilters } from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { OrderService } from 'src/order/order.service';
import { UserService } from 'src/user/user.service';
import { WxService } from 'src/wx/wx.service';
import { Receive } from './receive.interface'
// import { ParseJson5Pipe } from 'src/pipes/parseJson5';
// import { PraseJson5Interceptor } from 'src/interceptors/parseJson5';
import CONSTANTS from 'src/constants/order';
interface ReceiveResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
}


@Controller('receive')
export class ReceiveController {
  constructor(
    private readonly receiveService: ReceiveService,
    private readonly orderService: OrderService,
    private readonly userService: UserService,
    private readonly wxService: WxService
  ) {}

  // GET /receive/receives
  @Get('receives')
  async findAll(): Promise<ReceiveResponse<Receive[]>> {
    return {
      code: 0,
      message: 'success',
      data: await this.receiveService.findAll()
    }
  }

  // GET /receive/:id
  @Get(':_id')
  async findOne(@Param('_id') id: string): Promise<ReceiveResponse<Receive>> {
    return {
      code: 0,
      message: 'success',
      data: await this.receiveService.findOne(id)
    }
  }

  @Post('test')
  async test(@Body() body: any): Promise<any> {
    await this.orderService.test(body)
    return {
      code: 0,
      data: null,
      message: 'success'
    }
  }

  // POST /receive
  @Post()
  // 这里是提供给apifactory的hook
  async addOne(@Body() body: any): Promise<ReceiveResponse | string> {
    console.log("收到api工厂的数据", body)
    // FIXME: MQ异步
    try {
      if(body.type === 'order') {
        if(body.orderInfo) {
          // 1.如果是新增订单，入库，并同步给91haoka
          // XXX:这里是根据下游订单状态来判定是新增还是修改表。觉得应该该为从表中查找较为合适
          if(body.orderInfo.status === CONSTANTS.ORDER_STATUS_WAIT_PAY) {
            await this.orderService.addOne(body)
            this.wxService.sendMessageToQiyeWeixin({
              msgType: 'orderCreate',
              uid: body.orderInfo.uid,
              ...body
            })
          } else {
            // 2.修改订单，同步本地数据库，但是好像暂时同步不了给91haoka
            await this.orderService.editOneByOrderId(body.orderInfo.id, body)
            if(body.orderInfo.status === CONSTANTS.ORDER_STATUS_WAIT_DILIVERY) {
              await this.orderService.sendOrderTo91(body)
            }
            // 将来可能做一些别的自动化操作，比如调取weixin接口发送通知
            this.wxService.sendMessageToQiyeWeixin({
              msgType: 'orderChange',
              uid: body.orderInfo.uid,
              ...body
            })
          }
        }
      } else if(body.type === 'directSendOriginalData' && body.data && body.data.mod === 'user' && body.data.action === 'add') {  // 此外还有删除用户的推送delete
        // 有用户首次扫码进来了
        this.userService.addOne(body)
        this.wxService.sendMessageToQiyeWeixin({
          msgType: 'follow',
          ...body
        })
        this.wxService.sendTemplateMessageToUser(body)
      } else {
        await this.receiveService.addOne(body)
      }
    } catch (error) {
      console.error('addOne出错了', error.message)
      
    }
    return 'success'
  }

  // 给感叹号的回调
  @Post('order')
  async synchronousOrder(@Body() body: any): Promise<string> {
    console.log('收到感叹号推送', body)
    if(!body.outer_id) return 'SUCCESS'
    try {
      await this.orderService.receiveGantanhaoOrderChange(body)
    } catch (error) {
      console.error('感叹号推送出错', error.message)
      this.wxService.sendMessageToQiyeWeixin({
        msgType: 'error',
        data: {
          statusCode: null,
          timestamp: new Date().getTime(),
          path: '/api/v1/receive/order',
          method: 'post',
          message: error.message
        }
      })
    }
    return 'SUCCESS'
  }

  // PUT /receive/:id
  @Put(':_id')
  async editOne(@Param('id') id: string, @Body() body: any): Promise<ReceiveResponse> {
    await this.receiveService.editOne(id, body)
    return {
      code: 0,
      message: 'success',
      data: null
    }
  }

  // DELETE /receive/:id
  @Delete(':_id')
  async deleteOne(@Param('id') id: string): Promise<ReceiveResponse> {
    await this.receiveService.deleteOne(id)
    return {
      code: 0,
      message: 'success',
      data: null
    }
  }

  // 获取邀请二维码地址
  @Get('qrcode/:id')
  async getQrcode(@Param('id') id: string): Promise<any> {
    // { code: 0, msg: 'success', data: 'https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=gQFS8TwAAAAAAAAAAS5odHRwOi8vd2VpeGluLnFxLmNvbS9xLzAyNWZyR0pKeWFlVUUxMDAwMDAwN2QAAgQUI49kAwQAAAAA' }
    const ans = await this.receiveService.genarateWxQrcode({ id })
    return ans
  }

}
