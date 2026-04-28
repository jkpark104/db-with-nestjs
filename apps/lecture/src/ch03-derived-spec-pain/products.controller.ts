import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { getStore } from '@app/mock-data';
import { Ch03ProductDto } from './dto/product.dto';

const FAKE_CATEGORY = (id: number) => (id % 2 === 0 ? 'food' : 'beverage');

@ApiTags('products')
@Controller('products')
export class Ch03ProductsController {
  @Get()
  @ApiOkResponse({ type: [Ch03ProductDto] })
  list(): Ch03ProductDto[] {
    return getStore().products.map((p) => ({ ...p, category: FAKE_CATEGORY(p.id) })) as Ch03ProductDto[];
  }

  @Get(':id')
  @ApiOkResponse({ type: Ch03ProductDto })
  byId(@Param('id', ParseIntPipe) id: number): Ch03ProductDto {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    return { ...p, category: FAKE_CATEGORY(id) } as Ch03ProductDto;
  }
}
