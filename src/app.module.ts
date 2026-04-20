import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaModule } from './common/prisma/prisma.module';
import { Ch01Module } from './ch01-shop-open/ch01.module';
import { Ch02Module } from './ch02-catalog/ch02.module';
import { Ch03Module } from './ch03-order-crisis/ch03.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('PG_HOST'),
        port: config.get<number>('PG_PORT'),
        database: config.get('PG_DATABASE'),
        username: config.get('PG_USERNAME'),
        password: config.get('PG_PASSWORD'),
        autoLoadEntities: true,
        synchronize: true,
        logging: true,
      }),
    }),
    PrismaModule,
    Ch01Module,
    Ch02Module,
    Ch03Module,
  ],
})
export class AppModule {}
