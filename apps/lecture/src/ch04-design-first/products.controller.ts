import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type Product = components['schemas']['Product'];

@Controller('products')
export class Ch04ProductsController {
  @Get()
  list(): Product[] { return getStore().products; }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number): Product {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    return p;
  }
}
