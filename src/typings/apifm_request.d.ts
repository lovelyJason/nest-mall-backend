export interface DeliveryRequest {
  id: string
  expressCompanyId: string | number
  number: string
  orderGoodsShipper?: any[]
}
// https://user.api.it120.cc/doc.html#/%E5%90%8E%E5%8F%B0api%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3/%E8%AE%A2%E5%8D%95%E6%A8%A1%E5%9D%97/closeUsingPOST
// export interface CloseOrderRequest {
//   id: string
//   refundRemark?: string
// }