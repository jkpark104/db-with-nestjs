import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type Product = components['schemas']['Product'];

@Controller('products')
export class Ch06ProductsController {
  @Get()
  list(): Product[] { return getStore().products; }

  @Get(':id')
  // ❌ 의도적 위반: priceInWon 대신 price 반환 — contract test가 잡아낸다
  byId(@Param('id', ParseIntPipe) id: number) {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    const { priceInWon, ...rest } = p;
    return { ...rest, price: priceInWon };
  }
}
