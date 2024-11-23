import { Document } from 'mongoose';
 
export interface Order extends Document {
  readonly _id: string | number
  [props: string]: any
}