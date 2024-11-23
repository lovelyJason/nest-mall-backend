import { Injectable, PipeTransform, ArgumentMetadata  } from "@nestjs/common";

@Injectable()
export class ParseJson5Pipe implements PipeTransform  {
  transform(value: any, metadata: ArgumentMetadata) {
    console.log('---------------')
    console.log(value, metadata)
    return value;
  }
}