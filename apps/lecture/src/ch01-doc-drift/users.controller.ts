import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';

@Controller('users')
export class Ch01UsersController {
  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    const u = getStore().users.find((x) => x.id === id);
    if (!u) throw new NotFoundException();
    return u;
  }
}
