import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';

@Controller('products')
export class Ch01ProductsController {
  @Get()
  list() { return getStore().products; }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    return p;
  }
}
