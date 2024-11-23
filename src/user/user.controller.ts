import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

interface UserResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  async findAll(): Promise<any> {
    return {
      code: 0,
      message: 'success',
      data: await this.userService.findAll()
    }
  }

  async addOne(@Body() body: any): Promise<UserResponse> {
    try {
      await this.userService.addOne(body)
      return {
        code: 0,
        data: null,
        message: 'success'
      }
      
    } catch (error) {
      return {
        code: -1,
        message: error.message
      }
    }
  }

}
