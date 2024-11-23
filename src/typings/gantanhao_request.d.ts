enum GantanhaoOrderStatusnum {
  Pending = '120', // 待审核
  Delivered = '', // 已发货
  Activated = '', // 已激活
  Failure = '', // 开卡失败
  IdcardVerificationFailed = '',  // 身份证审核失败
  end = ''
}

export interface GantanhaoOrderCreateRequest {
  sku: string
  source_id: string
  share_id: string
  id_name: string
  id_num: string
  mobile: string
  name: string
  province_code?: string
  province?: string
  city_code?: string
  city?: string
  district_code?: string
  district?: string
  address: string
  pretty_number?: string // 购买号码
  sign: string
}

export interface GantanhaoOrderChangeResponse {
  outer_id?: string // 我们的订单id
  plan_mobile_produced?: string
  status?: string
  sign: string
  is_activated: string
  activated_at: string
  is_recharged?: string
  recharged_at?: string
  tracking_number?: string
  tracking_company?: string
  reason?: string
}

export interface GantanhaoOrderResultCallbackCheckRequest {
  id: string  // 订单id
  share_id: string
  token: string
  sign: string
  tracking_number?: string
  tracking_company_id?: string
  reason?: string
  active_status?: string
  activated_at?: string
  recharge_at?: string
  status?: string
  plan_mobile?: string
  plan_mobild_produced: string
}