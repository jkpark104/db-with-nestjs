import { NestFactory } from '@nestjs/core';
import { initStore } from '@app/mock-data';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  initStore('basic');
  const app = await NestFactory.create(AppModule);
  await app.listen(3002);
  console.log('orders-subgraph: http://localhost:3002/graphql');
}
void bootstrap();
