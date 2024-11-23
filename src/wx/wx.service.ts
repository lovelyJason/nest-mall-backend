import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { lastValueFrom } from 'rxjs';
import { ApifactoryService } from 'src/apifactory/apifactory.service';
import { WxResponse } from './wx.controller';
import { convertGantanhaoOrderStatus } from 'src/utils/convert';
import * as dayjs from 'dayjs';
export interface WxUserInfoResponse {
  openid: string;
  nickname: string;
  sex: number | string;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege?: string;
  unionid?: string;
}
export interface ApifmResponse<T = unknown> {
  code: number;
  data?: T;
  msg: string;
}

@Injectable()
export class WxService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly apifactoryService: ApifactoryService,
    private logger: Logger,
  ) {
    this.logger.log('WxService init');
  }
  Authorization =
    'Basic ' +
    Buffer.from(
      `${this.configService.get(
        'APIFM_BUSINESS_NUMBER',
      )}:${this.configService.get('APIFM_BUSINESS_SECRET')}`,
    ).toString('base64');
  id = null;
  // 后续以供封装为一个基类
  async apiHelper(methods, url, data): Promise<ApifmResponse> {
    const config: any = {
      method: methods,
      url: url,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: this.Authorization,
      },
    };
    if (methods === 'get' || methods === 'GET') {
      config.params = data;
    } else {
      config.data = data;
    }
    const res = await lastValueFrom(this.httpService.request(config));
    const ans = res.data;
    return ans;
  }

  async getAccessTokenAndOpenId(code: string) {
    const appId = this.configService.get('WX_GH_APP_ID');
    const secret = this.configService.get('WX_GH_APP_SECRET');
    console.log('code', code);
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`;
    const res = await lastValueFrom(this.httpService.get(url));
    const ans = res.data; //  {errcode: 40029, errmsg: 'invalid code, rid: 649336bd-03ad5f25-762ec41f'}
    return ans;
  }
  async getWxUserInfo(access_token: string, openid: string) {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
    const res = await lastValueFrom(this.httpService.get(url));
    const userInfo = res.data; // {"errcode":40003,"errmsg":" invalid openid "}
    console.log('wx userInfo', userInfo);
    return userInfo;
  }
  // 1.通过code获取access_token & openid
  async login(code: string) {
    const authInfo = await this.getAccessTokenAndOpenId(code);
    // console.log('wx authinfo', authInfo)
    if (!authInfo.access_token) {
      console.error('获取token失败', authInfo);
      return {
        code: -1,
        msg: authInfo.errmsg,
      };
    }
    const { access_token, openid } = authInfo;
    // 2.获取用户信息
    const userInfo = await this.getWxUserInfo(access_token, openid);
    if (!userInfo.openid) {
      return {
        code: -1,
        msg: userInfo.errmsg,
      };
    }
    // 3.根据openid反查用户列表进而找到用户编号
    const userListRes = await this.getUserIdByOpenid(openid);
    console.log('userListRes', userListRes); // 查不到返回700
    if (userListRes.code !== 0) {
      // 这里如果用户不是受邀请关注的，没有注册账号，就永远无法登录。还面临一个code只能使用一次的问题
      // return {
      //   code: -1,
      //   ...userListRes
      // }
      const addUserRes = await this.apifactoryService.addNewUser({
        avatarUrl: userInfo.headimgurl,
        isSeller: true,
        nick: userInfo.nickname,
        openid: userInfo.openid,
        remark: '非邀请注册',
        source: '2',
      });
      console.log('非扫码注册', addUserRes);
      if (addUserRes.code !== 0) {
        return {
          code: -1,
          ...addUserRes,
        };
      }
      this.apifactoryService.bindUserInviter({
        uidm: '8692323',
        uids: addUserRes.data.userBase.id,
      });
      return await this.getExtUserToken(addUserRes.data.userBase.id);
    }
    // if (!userListRes.data.result || userListRes.data.result.length <= 0) {
    //   return {
    //     code: -1,
    //     msg: '系统中不存在此用户',
    //   };
    // }
    const curUser = userListRes.data.result[0];
    const id = curUser.id;
    // status为NumberInt(1)为禁用
    const status = curUser.status;
    if (status === 1) {
      this.sendMessageToQiyeWeixin({
        msgType: 'loginFail',
        data: curUser,
      });
      return {
        code: 500,
        msg: '你由于违规行为已被禁用',
      };
    }
    this.id = id;
    // 4.修改用户信息
    const modifyRes = await this.modifyUser(id, userInfo);
    console.log('modifyUserRes', modifyRes); // { code: 0, msg: 'success' }
    if (modifyRes.code !== 0) {
      return {
        code: -1,
        ...modifyRes,
      };
    }
    this.sendMessageToQiyeWeixin({
      msgType: 'login',
      data: modifyRes.data,
    });
    return await this.getExtUserToken(id);
  }

  async modifyUser(id, userInfo) {
    const {
      openid,
      nickname,
      sex,
      province,
      city,
      country,
      headimgurl,
      privilege,
      unionid,
    } = userInfo;
    const modifyData = {
      avatarUrl: headimgurl,
      nick: nickname,
      openid,
      unionid,
      extJsonStr: JSON.stringify({
        sex,
        province,
        city,
        country,
        privilege,
      }),
      remark: '接口自动修改',
    };
    const url = 'https://user.api.it120.cc/user/apiExtUser/modify';
    const data = {
      id,
      ...modifyData,
    };
    const ans = await this.apiHelper('post', url, data);
    if (ans.code === 0) {
      return {
        ...ans,
        data: modifyData,
      };
    }
    return ans;
  }

  async getExtUserToken(id: number | string) {
    const url = 'https://user.api.it120.cc/user/apiExtUser/token';
    const data = {
      id,
    };
    const ans = await this.apiHelper('get', url, data);
    return ans;
  }
  // 根据openid反查用户编号id
  async getUserIdByOpenid(openid: string): Promise<ApifmResponse<any>> {
    const url = 'https://user.api.it120.cc/user/apiExtUser/list';
    const data = {
      page: 1,
      pageSize: 50,
      wxOpenid: openid,
    };
    const ans = await this.apiHelper('post', url, data);
    return ans;
  }
  // 企业微信机器人webhook
  async sendMessageToQiyeWeixin(body) {
    // this.apifactoryService.getApiExtUserInfoById('8688018')
    const url = this.configService.get('QIYEWEIXIN_WEBHOOK_URL');
    let req: any = {
      msgtype: 'markdown',
      markdown: {
        mentioned_list: ['@all'],
      },
    };
    const user: Record<string, any> = {};
    if (body.uid) {
      try {
        const userRes: any = await this.apifactoryService.getApiExtUserInfoById(
          body.uid,
        );
        user.id = userRes.data?.userBase?.id;
        user.nick = userRes.data?.userBase?.nick;
      } catch (error) {
        console.error('查询用户信息出错', error.message);
      }
    }
    // 新增用户
    if (body.msgType === 'follow') {
      const referrer: {
        id: string | number;
        nick: string;
      } = {
        id: 0,
        nick: '',
      };
      if (body.data?.data?.referrer) {
        try {
          const res: any = await this.apifactoryService.getApiExtUserInfoById(
            body.data?.data?.referrer as string,
          );
          referrer.id = res.data?.userBase?.id;
          referrer.nick = res.data?.userBase?.nick;
        } catch (error) {
          console.error('查询邀请人信息出错', error.message);
        }
        req.markdown.content = `有新用户<font color=\"info\">${body.data?.data?.id}</font>扫码关注了。\n
          >ip:<font color=\"warning\">${body.data?.data?.ipAdd}</font>
          >邀请人编号:<font color=\"warning\">${body.data?.data?.referrer}</font>
          >邀请人昵称:<font color=\"warning\">${referrer.nick}</font>
          `;
      } else {
        req.markdown.content = `有新用户<font color=\"info\">${body.data?.data?.id}</font>关注了公众号。\n
        >无邀请人信息,系统自动为其绑定一个上级
        `;
      }
    } else if (body.msgType === 'login') {
      // 登录
      req = {
        msgtype: 'template_card',
        template_card: {
          card_type: 'news_notice',
          main_title: {
            title: '有用户正在登录',
          },
          card_image: {
            url: body.data.avatarUrl,
          },
          horizontal_content_list: [
            {
              keyname: '登录人昵称',
              value: body.data.nick,
            },
          ],
          card_action: {
            type: 1,
            url: 'https://work.weixin.qq.com/?from=openApi',
          },
        },
      };
    } else if (body.msgType === 'loginFail') {
      req = {
        msgtype: 'template_card',
        template_card: {
          card_type: 'news_notice',
          main_title: {
            title: '有用户正在登录, But已经被封禁在外',
          },
          card_image: {
            url: body.data.avatarUrl,
          },
          horizontal_content_list: [
            {
              keyname: '登录人昵称',
              value: body.data.nick,
            },
          ],
          card_action: {
            type: 1,
            url: 'https://work.weixin.qq.com/?from=openApi',
          },
        },
      };
    } else if (body.msgType === 'orderCreate') {
      // 创建订单
      req.markdown.content = `有一条新订单创建了。\n
        >订单id: <font color=\"warning\">${body.orderInfo.id}</font>
        >订单编号: <font color=\"warning\">${body.orderInfo.orderNumber}</font>
        >用户昵称: <font color=\"warning\">${user.nick}</font>
        >商品: <font color=\"warning\">${body.goods
          .map((item) => item.goodsName)
          .join(',')}</font>
        >订单金额: <font color=\"warning\">${body.orderInfo.amount}</font>
        >付款金额: <font color=\"warning\">${body.orderInfo.amountReal}</font>
        >订单状态: <font color=\"warning\">${body.orderInfo.statusStr}</font>
        >收货人姓名: <font color=\"warning\">${body.logistics.linkMan}</font>
        >收货地址: <font color=\"warning\">${body.logistics.provinceStr}${
        body.logistics.cityStr
      }${body.logistics.areaStr}${body.logistics.address}</font>
      `;
    } else if (body.msgType === 'orderChange') {
      req.markdown.content = `有一条订单状态更新。\n
        >订单id: <font color=\"warning\">${body.orderInfo.id}</font>
        >订单编号: <font color=\"warning\">${body.orderInfo.orderNumber}</font>
        >用户昵称: <font color=\"warning\">${user.nick}</font>
        >商品: <font color=\"warning\">${body.goods
          .map((item) => item.goodsName)
          .join(',')}</font>
        >订单金额: <font color=\"warning\">${body.orderInfo.amount}</font>
        >付款金额: <font color=\"warning\">${body.orderInfo.amountReal}</font>
        >订单状态: <font color=\"warning\">${body.orderInfo.statusStr}</font>
        >收货人姓名: <font color=\"warning\">${body.logistics.linkMan}</font>
        >收货地址: <font color=\"warning\">${body.logistics.provinceStr}${
        body.logistics.cityStr
      }${body.logistics.areaStr}${body.logistics.address}</font>
      `;
    } else if (body.msgType === 'gantanhaoPost') {
      req.markdown.content = `感叹号推送过来一条数据：\n
        >外部订单id: <font color=\"warning\">${body.outer_id}</font>
        >签名: <font color=\"warning\">${body.sign}</font>
        >生产号码: <font color=\"warning\">${
          body.plan_mobile_produced || '无'
        }</font>
        >状态: <font color=\"warning\">${convertGantanhaoOrderStatus(
          body.status,
        )}</font>
        >失败原因: <font color=\"warning\">${body.reason || '无'}</font>
        >物流公司: <font color=\"warning\">${body.tracking_company}</font>
        >物流单号: <font color=\"warning\">${body.tracking_number}</font>
        >是否已激活: <font color=\"warning\">${
          body.is_activated === '1' ? '是' : '否'
        }</font>
        >是否已首充: <font color=\"warning\">${
          body.is_recharged === '1' ? '是' : '否'
        }</font>
      `;
    } else if (body.msgType === 'error') {
      req.markdown.content = `系统出现错误：\n
        >状态码: <font color=\"warning\">${body.data.statusCode}</font>
        >时间: <font color=\"warning\">${body.data.timestamp}</font>
        >请求URL: <font color=\"warning\">${body.data.path}</font>
        >请求方法: <font color=\"warning\">${body.data.method}</font>
        >错误堆栈: <font color=\"warning\">${body.data.message}</font>
      `;
    } else if (body.msgType === 'restarService') {
      req.markdown.content = `## 服务正在重启...`;
    } else if (body.msgType === 'refundSuccess') {
      req.markdown.content = `有一笔订单自动发起原路退款成功。\n
        >订单id: <font color=\"warning\">${body.data.orderInfo.id}</font>
        >订单编号: <font color=\"warning\">${
          body.data.orderInfo.orderNumber
        }</font>
        >用户昵称: <font color=\"warning\">${user.nick}</font>
        >用户编号: <font color=\"warning\">${body.data.orderInfo.uid}</font>
        >收货人姓名: <font color=\"warning\">${
          body.data.logistics.linkMan
        }</font>
        >退款商品: <font color=\"warning\">${body.data.goods
          .map((item) => item.goodsName)
          .join(',')}</font>
        >退款金额: <font color=\"warning\">${
          body.data.orderInfo.amountReal
        }</font>
        >退款时间: <font color=\"warning\">${dayjs(new Date().getTime()).format(
          'YYYY-MM-DD HH:mm:ss',
        )}</font>
        >详细信息: <font color=\"warning\">详细信息请登录至后台查看：https://admin.qdovo.com/#/user/apiExtOrder/detail?id=${
          body.data.orderInfo.id
        }</font>
      `;
    } else if (body.msgType === 'axiosUnusual') {
      req.markdown.content = `有异常接口\n
      >url: ${body.data.url}
      >method: ${body.data.method}
      >payload: ${body.data.payload}
      >response: ${JSON.stringify(body.data.response)}
      `;
    }
    try {
      await lastValueFrom(this.httpService.post(url, req));
    } catch (error) {
      console.log('企业微信消息发送失败', error.message);
    }
  }
  // 发送模板消息
  async sendTemplateMessageToUser(body: any) {
    const referrer = body.data.data.referrer; // 邀请人的id
    if (!referrer) return;
    const referrerInfo: any =
      await this.apifactoryService.getApiExtUserInfoById(referrer);
    const referrerOpenid = referrerInfo.data?.userBaseWx?.openid;
    const id = body.data.uid; // 被邀请人的id
    const time = body.data.data.dateAdd;
    // XXX:后续应该持久化或缓存于服务器内存中
    const res = await this.apifactoryService.getMpConfigList();
    const access_token = res.data?.accesstoken;
    const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${access_token}`;
    const req = {
      touser: referrerOpenid,
      template_id: this.configService.get('WX_GH_TEMPLATE_MEMBERSHIP_JOIN'),
      url: 'https://mall.qdovo.com/myusers',
      data: {
        keyword1: {
          value: String(id),
        },
        keyword2: {
          value: time,
        },
        remark: {
          value: '再接再厉！',
        },
      },
    };
    const sendMsgRes = (await lastValueFrom(this.httpService.post(url, req)))
      .data;
    if (sendMsgRes.errcode !== 0) {
      console.error('发送模板消息出错', sendMsgRes.errmsg);
    }
  }
}
