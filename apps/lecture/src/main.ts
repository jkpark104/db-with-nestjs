import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initStore } from '@app/mock-data';

async function bootstrap(): Promise<void> {
  initStore('basic');

  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  console.log(`lecture app running on http://localhost:${port}`);
}
void bootstrap();
