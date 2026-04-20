import { Controller, Get } from '@nestjs/common';
import { Ch03PrismaService } from './ch03-prisma.service';

@Controller('ch03/prisma')
export class Ch03PrismaController {
  constructor(private readonly service: Ch03PrismaService) {}

  @Get('orders/naive')
  findNaive() { return this.service.findOrdersNaive(); }

  @Get('orders/include')
  findInclude() { return this.service.findOrdersInclude(); }

  @Get('orders/select')
  findSelect() { return this.service.findOrdersSelect(); }

  @Get('orders/raw-join')
  findRawJoin() { return this.service.findOrdersRawJoin(); }
}
