import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import _ from 'lodash'

@Injectable()
export class PraseJson5Interceptor implements NestInterceptor {
  public intercept(_context: ExecutionContext, next: CallHandler) {

    // changing request
   let request = _context.switchToHttp().getRequest();
   console.log(request)
    if (request.body.name) {
      request.body.name = 'modify request';
    }

    return next.handle().pipe(
      _.map(flow => {
        flow.name = 'changeing response body';
        return flow;
      }),
    );
  }
}