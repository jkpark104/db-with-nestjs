import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { getStore } from '@app/mock-data';
import { Ch02OrderDto } from './dto/order.dto';

@ApiTags('orders')
@Controller('orders')
export class Ch02OrdersController {
  @Get()
  @ApiOkResponse({ type: [Ch02OrderDto] })
  list(): Ch02OrderDto[] { return getStore().orders as Ch02OrderDto[]; }
}
