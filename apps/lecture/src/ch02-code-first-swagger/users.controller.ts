import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { getStore } from '@app/mock-data';
import { Ch02UserDto } from './dto/user.dto';
import { ErrorResponseDto } from './dto/error-response.dto';

@ApiTags('users')
@Controller('users')
export class Ch02UsersController {
  @Get(':id')
  @ApiOkResponse({ type: Ch02UserDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  byId(@Param('id', ParseIntPipe) id: number): Ch02UserDto {
    const u = getStore().users.find((x) => x.id === id);
    if (!u) throw new NotFoundException();
    return u as Ch02UserDto;
  }
}
