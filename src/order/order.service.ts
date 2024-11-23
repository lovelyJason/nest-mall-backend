import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs'   // https://zhuanlan.zhihu.com/p/38133091
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto'    // 好像直接导入crypto无效？
import { Logger } from 'nestjs-pino';
import GANTANHAOCONSTANTS from '../constants/gantanhao_order'
import { ApifactoryService } from 'src/apifactory/apifactory.service';
import { WxService } from 'src/wx/wx.service';
import EXPRESSCOMPANYCONSTANTS from '../constants/express_company'

import { Order } from './order.interface';
import type { GantanhaoOrderCreateRequest, GantanhaoOrderChangeResponse, GantanhaoOrderResultCallbackCheckRequest } from '../typings/gantanhao_request';

interface ApifmResponse<T = unknown> {
  code: number;
  data?: T;
  msg: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel('Orders') private readonly OrderModel: Model<Order>,
    private readonly configService: ConfigService,
    private readonly apifactoryService: ApifactoryService,
    private readonly wxService: WxService,
    private logger: Logger
  ) {
    this.logger.log('OrderService init')
  }
  Authorization = 'Basic ' + Buffer.from(`${this.configService.get('APIFM_BUSINESS_NUMBER')}:${this.configService.get('APIFM_BUSINESS_SECRET')}`).toString('base64')

  async findAll(): Promise<any[]> {
    const orders = await this.OrderModel.find()
    return orders
  }

  // 添加单个推送， apifactory的
  async addOne(body: any): Promise<void> {
    await this.OrderModel.create(body)
  }

  // 修改apifactory本地数据库订单状态
  async editOneByOrderId(id: number, body: any): Promise<any> {
    // 不能直接替换，会把感叹号的数据给覆盖掉
    // await this.receiveModel.findOneAndReplace({  // 操作mongoose数据库前面要await，否则是失败的为啥？
    //   "orderInfo.id": id
    // }, body)
    const res = await this.OrderModel.findOne({ "orderInfo.id": id }, { gantanhao: 1 })
    if(res) {
      const gantanhao = res.gantanhao
      await this.OrderModel.findOneAndReplace({  // 操作mongoose数据库前面要await，否则是失败的为啥？
        "orderInfo.id": id
      }, { gantanhao, ...body })
      // 事实证明，写在前面的参数如gantanhao会被写到到文档的顶部
    }
  }

  cryptSign(params) {
    const md5 = crypto.createHash('md5');
    return md5.update(params).digest('hex');
  }

  async sendOrderTo91(body: any) {
    if(!body.goods || !body.goods[0]) {
      console.error('商品名称不存在')
      return
    }
    const share_id = this.configService.get('91HAOKA_SHARE_ID')
    const api_token = this.configService.get('91HAOKA_API_TOKEN')
    const sku = body.goods[0].goodsName
    const source_id = body.orderInfo.id
    const params = `share_id=${share_id}&sku=${sku}&source_id=${source_id}${api_token}`
    const sign = this.cryptSign(params)

    const goods = body.goods && body.goods.length > 0 ? body.goods[0] : {}
    const logistics = body.logistics || {}
    const orderInfo = body.orderInfo || {}
    const user = body.userBean || {}  // 接口没有返回这个
    const { id } = orderInfo
    const { goodsName } = goods
    const {
      linkMan, // XXX:后续通过实名认证获取身份证姓名而不是收件人
      idcard,
      mobile,
      provinceId,
      provinceStr,
      cityId,
      cityStr,
      districtId, // 区县编码
      areaStr,
      address
    } = logistics
    // const { nick } = user
    const req: GantanhaoOrderCreateRequest = {
      sku: goodsName,  // 提醒客户商品名称需保持一致
      source_id: id, // 来源id
      share_id: this.configService.get('91HAOKA_SHARE_ID'),
      id_name: linkMan,
      id_num: idcard,
      mobile: mobile,
      name: linkMan,
      province_code: provinceId,
      province: provinceStr,
      city_code: cityId,
      city: cityStr,
      district_code: districtId,
      district: areaStr,
      address: address,
      sign
    }
    
    // 返回的一个Observable,属于rxjs的
    // 通过.pipi(map(res => res.data))  或   .toPromise()
    // toPromise咋rx7中已弃用
    // 使用lastValueFrom/firstValueFrom 或 改用响应式编程
    let testReq = {}
    const url = 'http://notify.91haoka.cn/api/plan-market/order/purchase'
    const res = await lastValueFrom(this.httpService.post(url, req))
    // console.log('----------', res.data) //  { msg: { code: 50422, info: 'The source id field is required.' } }
    let ans = res.data
    this.logger.log(ans)
    console.log('91haoka提单请求参数', req)
    console.log('91haoka提单返回值', ans)
    ans.msg = ans.msg || {}
    ans.data = ans.data || {}
    if(ans.msg.code == 0 && ans.data.status === '120') {   // 成功接收订单
      const { source_id, id, status } = ans.data
      await this.OrderModel.findOneAndUpdate({  // 操作mongoose数据库前面要await，否则是失败的为啥？
        "orderInfo.id": source_id
      }, {
        $set: {
          gantanhao: ans.data
        }
      })
    }
    return ans
  }
  matchCourierCompanyNumber(name: string, code: string) {
    if(name.toLocaleUpperCase().includes('EMS')) {
      return EXPRESSCOMPANYCONSTANTS.EMS
    } else if(code.toLocaleUpperCase().includes('JDV')) {
      return EXPRESSCOMPANYCONSTANTS.JD
    } else if(code.toLocaleUpperCase().includes('SF')) {
      return EXPRESSCOMPANYCONSTANTS.SF
    }
  }
  // 感叹号结果回调
  // 已发货 已激活 开卡失败 身份证审核失败 订单终止 其余状态不会回调；还有一个订单初始状态120 初步审核/成功接收订单
  async receiveGantanhaoOrderChange(body: GantanhaoOrderChangeResponse) {
    const orderId = body.outer_id
    const exitOrder = await this.OrderModel.findOne({ "orderInfo.id": Number.parseInt(orderId) }) // 查不到就是null，跟返回字段没关系;查到了就是这条文档
    if(exitOrder) {
      // 1. 同步到本地数据库，主要是更新订单状态,激活状态，失败原因,生产号码，物流信息等
      await this.OrderModel.findOneAndUpdate({
        // 需要注意，类型必须一致，数据库里存的订单id是number，这里filter的id也必须是number
        "orderInfo.id": Number.parseInt(orderId)
      }, {
        $set: {
          gantanhao: body
        }
      })
      // 2. 同步到api factory，主要是更新订单状态，专属的感叹号订单状态。主要是调一下发货接口,退款，关闭之类的（或者在客户端，后台调用我自己的接口算了），其他状态或许可以通过更新订单扩展属性接口
      // https://user.api.it120.cc/doc.html#/%E5%90%8E%E5%8F%B0api%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3/%E8%AE%A2%E5%8D%95%E6%A8%A1%E5%9D%97/updateExtJsonUsingPOST
      this.apifactoryService.updateOrderExtJson({ // 订单扩展数据变化并不会让api工厂推送数据过来
        id: orderId,
        extJsonStr: JSON.stringify(body)
      })
      // 3.发送机器人通知
      this.wxService.sendMessageToQiyeWeixin({
        msgType: 'gantanhaoPost',
        ...body
      })
      // 订单失败即刻退款
      if ([
        GANTANHAOCONSTANTS.ORDER_STATUS_FAILURE,
        GANTANHAOCONSTANTS.ORDER_STATUS_IDCARD_AUDIT_FAILURE
      ].includes(body.status)) {
        // 如果下单待支付后，感叹号失败的很快，那么待支付的订单没办法退款，应该改为支付完成再提单
        // const refundRes = await this.apifactoryService.refund({
        //   id: orderId,
        //   money: exitOrder.orderInfo.amountReal,
        //   toWhere: '-1',  // 原路退回
        //   orderStatus: '-1',
        //   remark: '系统自动完成退款'
        // })
        // console.log('refundRes', refundRes)
        // if (refundRes.code === 0) {
        //   this.wxService.sendMessageToQiyeWeixin({
        //     msgType: 'refundSuccess',
        //     data: exitOrder,
        //     uid: exitOrder.orderInfo.uid
        //   })
        // }
      } else if (body.status === GANTANHAOCONSTANTS.ORDER_STATUS_DELIVERED) {
        // tracking_number以JDV,SF开头
        const expressCompanyNumber = this.matchCourierCompanyNumber(body.tracking_company, body.tracking_number)
        const deliveryRes = await this.apifactoryService.delivery({
          id: orderId,
          expressCompanyId: expressCompanyNumber,
          number: body.tracking_number
        })
        if(deliveryRes.code === 0) {
          console.log(orderId, '自动发货成功')
        }
      } else if (body.is_activated === '1') {
        // 激活成功可以设为交易成功，进而触发佣金到账
        // this.apifactoryService.setOrderSuccess(orderId)
      }
    } else {
      // 如果感叹号推过来的订单号不存在，直接新建一条
      // await this.OrderModel.create(body)
    }
  }

  async test(body) {
    let res = await this.apifactoryService.test()
  }
}
