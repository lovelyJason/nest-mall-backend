import { Injectable } from '@nestjs/common';
// import { HttpService } from '@nestjs/axios/dist';

// 为了在receive.service中操作数据库
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs'   // https://zhuanlan.zhihu.com/p/38133091
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto'    // 好像直接导入crypto无效？
import { Logger } from 'nestjs-pino';
import GANTANHAOCONSTANTS from '../constants/gantanhao_order'


// 引入请求参数的各种类型声明
import { Receive } from './receive.interface';
import type { GantanhaoOrderCreateRequest, GantanhaoOrderChangeResponse, GantanhaoOrderResultCallbackCheckRequest } from '../typings/gantanhao_request';

interface ApifmResponse<T = unknown> {
  code: number;
  data?: T;
  msg: string;
}

// new Buffer已废弃
// MjMwNTE3MTgxNzAzMjgzMDo5YWQ0MWRmMDIwY2VkOWZhNzcxMWUxNDc5M2I4YzViMw==
// console.log(Buffer.from('2305171817032830:9ad41df020ced9fa7711e14793b8c5b3').toString('base64'))

@Injectable()
export class ReceiveService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel('Receives') private readonly receiveModel: Model<Receive>,
    private readonly configService: ConfigService,
    private logger: Logger
  ) {
    this.logger.log('ReceiveService init')
  }
  
  Authorization = 'Basic ' + Buffer.from(`${this.configService.get('APIFM_BUSINESS_NUMBER')}:${this.configService.get('APIFM_BUSINESS_SECRET')}`).toString('base64')

  // private readonly logger = new Logger(ReceiveService.name);

  // 查找所有推送
  // mongoose 操作数据库是异步的，所以使用 async/await
  async findAll(): Promise<any[]> {
    const receives = await this.receiveModel.find()
    return receives
  }

  // 查找单个推送
  async findOne(id: string): Promise<Receive> {
    return await this.receiveModel.findById(id)
  }

  // 添加单个推送， apifactory的
  async addOne(body: any): Promise<void> {
    // body._id = body.orderInfo.id
    await this.receiveModel.create(body)
  }
  async test(body: any) {
    // const res = await this.receiveModel.findOne({ "orderInfo.id": 2024284 }, { gantanhao: 1 })  // 查找不到就是null
    // console.log('testres', res)
    // return res
  }
  // 修改apifactory本地数据库订单状态
  async editOneByOrderId(id: number, body: any): Promise<any> {
    // 不能直接替换，会把感叹号的数据给覆盖掉
    // await this.receiveModel.findOneAndReplace({  // 操作mongoose数据库前面要await，否则是失败的为啥？
    //   "orderInfo.id": id
    // }, body)
    const res = await this.receiveModel.findOne({ "orderInfo.id": id }, { gantanhao: 1 })
    if(res) {
      const gantanhao = res.gantanhao
      await this.receiveModel.findOneAndReplace({  // 操作mongoose数据库前面要await，否则是失败的为啥？
        "orderInfo.id": id
      }, { gantanhao, ...body })
      // 事实证明，写在前面的参数如gantanhao会被写到到文档的顶部
    }
  }

  // 编辑单个数据
  async editOne(id: string, body: any): Promise<void> {
    await this.receiveModel.findByIdAndUpdate(id, body)
  }

  // 删除单个数据
  async deleteOne(id: string): Promise<void> {
    await this.receiveModel.findByIdAndDelete(id)
  }

  // 查询文档进行修改的示例
  // mongoose新增字段
  // await this.receiveModel.findByIdAndUpdate('648e8c949747560400f5737b', {
  //   '$set': {
  //     'add_column': '1234568789'
  //   }
  // })
  // await this.receiveModel.findOneAndUpdate({  // 操作mongoose数据库前面要await，否则是失败的为啥？
  //   "orderInfo.id": "28018"
  // }, {
  //   $set: {
  //     gantanhao_id: "testgantanhao_id"
  //   }
  // })

  /* ---------------------------以下是api factory的订单操作------------------------------------- */
  // 发货, https://user.api.it120.cc/doc.html#/%E5%90%8E%E5%8F%B0api%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3/%E8%AE%A2%E5%8D%95%E6%A8%A1%E5%9D%97/fahuoUsingPOST
  async apiHelper(url, data): Promise<ApifmResponse> {
    const res = await lastValueFrom(this.httpService.post(url, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": this.Authorization
      }
    }))
    const ans = res.data
    return ans
  }

  async genarateWxQrcode(body: any): Promise<ApifmResponse> {
    const url = 'https://user.api.it120.cc/user/wx/mp/qrcode'
    const data = {
      content: `invite:${body.id}`
    }
    const ans = await this.apiHelper(url, data)
    return ans
  }

}
