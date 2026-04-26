import { NestFactory } from '@nestjs/core';
import { initStore } from '@app/mock-data';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  initStore('basic');
  const app = await NestFactory.create(AppModule);
  await app.listen(3001);
  console.log('users-subgraph: http://localhost:3001/graphql');
}
void bootstrap();
