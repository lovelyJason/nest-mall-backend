import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { lastValueFrom } from 'rxjs';

import type { DeliveryRequest } from 'src/typings/apifm_request';

export interface ApifmResponse<T = unknown> {
  code: number;
  data?: T;
  msg: string;
}

export interface UserData {
  avatarUrl: string;
  extJsonStr?: string;
  isSeller: boolean;
  nick: string;
  openid: string;
  remark?: string;
  source: '0' | '1' | '2' | '3'; // 2代表公众号
}

export interface BindUserInviterData {
  uidm: string; // 邀请人id
  uids: string; // 注册用户id
}

@Injectable()
export class ApifactoryService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private logger: Logger,
  ) {
    this.logger.log('ApifactoryService init');
  }
  Authorization =
    'Basic ' +
    Buffer.from(
      `${this.configService.get(
        'APIFM_BUSINESS_NUMBER',
      )}:${this.configService.get('APIFM_BUSINESS_SECRET')}`,
    ).toString('base64');

  init() {
    console.log('Authorization', this.Authorization);
  }
  /* ---------------------------以下是api factory的后台接口相关操作------------------------------------- */
  async apiHelper(methods, url, data): Promise<ApifmResponse<any>> {
    const config: any = {
      method: methods,
      url: url,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: this.Authorization,
      },
    };
    if (methods && methods.toLocaleUpperCase() === 'GET') {
      config.params = data;
    } else {
      config.data = data;
    }
    const res = await lastValueFrom(this.httpService.request(config));
    const ans = res.data;
    return ans;
  }

  async updateOrderExtJson(body) {
    const url = 'https://user.api.it120.cc/user/apiExtOrder/updateExtJson';
    const data = {
      id: body.id,
      extJsonStr: body.extJsonStr,
    };
    const ans = await this.apiHelper('post', url, data);
    return ans;
  }

  getApiExtUserInfoById(id: number | string) {
    const url = 'https://user.api.it120.cc/user/apiExtUser/info';
    const req = {
      id,
    };
    return this.apiHelper('get', url, req);
  }

  getMpConfigList() {
    const url = 'https://user.api.it120.cc/user/wx/mp/list';
    const data = {};
    return this.apiHelper('get', url, data); // {data: {accesstoken: ''}}
  }

  // test() {
  //   const url = 'https://user.api.it120.cc/user/apiExtOrder/fahuo333'
  //   const data = {}
  //   return this.apiHelper('post', url, data)   // {data: {accesstoken: ''}}
  // }
  test() {
    const url = 'https://user.api.it120.cc/user/apiExtOrder/fahuo';
    const data = {};
    return this.apiHelper('post', url, data); // {data: {accesstoken: ''}}
  }

  async delivery(body: DeliveryRequest) {
    const url = 'https://user.api.it120.cc/user/apiExtOrder/fahuo';
    const data = {
      id: body.id, // 订单id
      expressCompanyId: body.expressCompanyId, // 快递公司ID，如需自己配送或者其他快递公司，请传 -1
      number: body.number, // 快递单号
      // orderGoodsShipper: [] // 发货的商品信息及数量[{orderGoodsId: 123, number: 456}] , 不传该参数代表全部商品
    };
    // {"code":0,"msg":"success"}
    return this.apiHelper('post', url, data);
  }

  async refund(body: any) {
    const { id, money, toWhere, orderStatus, remark } = body;
    // https://user.api.it120.cc/doc.html#/%E5%90%8E%E5%8F%B0api%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3/%E8%AE%A2%E5%8D%95%E6%A8%A1%E5%9D%97/refundUsingPOST
    const url = 'https://user.api.it120.cc/user/apiExtOrder/refund';
    const data = {
      id,
      money,
      toWhere,
      orderStatus,
      remark,
    };
    return this.apiHelper('post', url, data);
  }

  async setOrderSuccess(id: number | string) {
    // https://user.api.it120.cc/doc.html#/%E5%90%8E%E5%8F%B0api%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3/%E8%AE%A2%E5%8D%95%E6%A8%A1%E5%9D%97/successUsingPOST
    const url = 'https://user.api.it120.cc/user/apiExtOrder/success';
    const data = {
      id,
    };
    return this.apiHelper('post', url, data);
  }

  async wxmpAuth(code: string) {
    const config = {
      method: 'post',
      url: 'https://api.it120.cc/jasonhuang',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        code,
      },
    };
    await lastValueFrom(this.httpService.request(config));
  }

  addNewUser(data: UserData) {
    // https://user.api.it120.cc/doc.html#/%E5%90%8E%E5%8F%B0api%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3/%E7%94%A8%E6%88%B7%E7%AE%A1%E7%90%86/addNewUserUsingPOST    const url = 'https://user.api.it120.cc/user/apiExtOrder/refund'
    /**
     * {
    "code": 0,
    "data": {
        "extJson": {},
        "userBase": {
            "birthdayProcessSuccessYear": 0,
            "cardNumber": "2307132123546130004",
            "dateAdd": "2023-07-13 21:23:46",
            "id": 9001192,
            "ipAdd": "113.99.148.200",
            "isFaceCheck": false,
            "isIdcardCheck": false,
            "isManager": false,
            "isSeller": true,
            "isSendRegisterCoupons": false,
            "isShopManager": false,
            "isTeamLeader": false,
            "isTeamMember": false,
            "isUserAttendant": false,
            "levelRenew": false,
            "mobileVisInvister": true,
            "referrerType": 0,
            "secondsAfterRegister": 0,
            "sellerLevelId": 315,
            "source": 0,
            "sourceStr": "小程序",
            "status": 0,
            "statusStr": "默认",
            "taskUserLevelSendMonth": 0,
            "taskUserLevelSendPerMonth": false,
            "taskUserLevelUpgrade": false,
            "userId": 54613
        }
    },

     */
    const url = 'https://user.api.it120.cc/user/apiExtUser/addNewUser';
    return this.apiHelper('post', url, data);
  }

  async bindUserInviter(data: BindUserInviterData) {
    // https://user.api.it120.cc/doc.html#/%E5%90%8E%E5%8F%B0api%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3/%E5%88%86%E9%94%80%E7%AE%A1%E7%90%86/bindUsingPOST
    const url = 'https://user.api.it120.cc/user/apiExtUserInviter/bind';
    return this.apiHelper('post', url, data);
  }
}
