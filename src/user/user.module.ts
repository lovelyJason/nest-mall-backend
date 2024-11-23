import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from 'src/schema/user.shcema';
import { HttpModule } from '@nestjs/axios';

const UserTable = MongooseModule.forFeature([{ schema: UserSchema, name: 'Users' }])

@Module({
  imports: [UserTable, HttpModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
