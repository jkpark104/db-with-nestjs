import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { dump } from 'js-yaml';
import { AppModule } from '../apps/lecture/src/app.module';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('OAS Lecture API (code-derived)')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const out = 'contracts/openapi.from-code.yaml';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, dump(document));
  console.log(`[swagger:export] wrote ${out}`);
  await app.close();
}
main().catch((e: unknown) => {
  process.stderr.write(`[swagger:export] ERROR: ${String(e)}\n`);
  process.exit(1);
});
