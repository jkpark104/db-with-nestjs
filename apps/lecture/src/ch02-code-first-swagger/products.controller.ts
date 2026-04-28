import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { getStore } from '@app/mock-data';
import { Ch02ProductDto } from './dto/product.dto';
import { ErrorResponseDto } from './dto/error-response.dto';

@ApiTags('products')
@Controller('products')
export class Ch02ProductsController {
  @Get()
  @ApiOkResponse({ type: [Ch02ProductDto] })
  list(): Ch02ProductDto[] { return getStore().products as Ch02ProductDto[]; }

  @Get(':id')
  @ApiOkResponse({ type: Ch02ProductDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  byId(@Param('id', ParseIntPipe) id: number): Ch02ProductDto {
    const p = getStore().products.find((x) => x.id === id);
    if (!p) throw new NotFoundException();
    return p as Ch02ProductDto;
  }
}
