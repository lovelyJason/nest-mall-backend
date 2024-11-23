import { Document } from 'mongoose';
 
export interface Receive extends Document {
  readonly _id: string | number
  [props: string]: any
}