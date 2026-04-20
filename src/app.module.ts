import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaModule } from './common/prisma/prisma.module';

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
  ],
})
export class AppModule {}
