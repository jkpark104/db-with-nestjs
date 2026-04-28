import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { getStore } from '@app/mock-data';
import type { components } from '@contracts/generated';

type User = components['schemas']['User'];

@Controller('users')
export class Ch06UsersController {
  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number): User {
    const u = getStore().users.find((x) => x.id === id);
    if (!u) throw new NotFoundException();
    return u;
  }
}
