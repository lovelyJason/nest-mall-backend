import { Injectable, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
@Injectable()
export class UserService {
  constructor(
    @InjectModel('Users') private readonly userModel: Model<any>
  ) {
  }
  async findAll(): Promise<void> {
    await this.userModel.find()
  }
  async addOne(body: any): Promise<void> {
    await this.userModel.create(body)
  }
}
