import 'reflect-metadata';
import OpenAPIResponseValidator from 'openapi-response-validator';
import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Ch07GeneratedHooksModule } from '../../apps/lecture/src/ch07-generated-hooks/ch07.module';

jest.mock('@app/mock-data', () => ({
  initStore: jest.fn(),
  getStore: jest.fn(() => ({
    products: [
      { id: 1, name: 'Test Product', priceInWon: 10000, stock: 5, description: 'desc', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    users: [{ id: 1, email: 'a@b.c', name: 'User', createdAt: '2024-01-01T00:00:00.000Z' }],
    orders: [],
    categories: [],
    productCategories: [],
    orderItems: [],
    reviews: [],
  })),
}));

const spec = yaml.load(fs.readFileSync('contracts/openapi.yaml', 'utf8')) as any;

describe('Contract: POST /orders', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [Ch07GeneratedHooksModule] }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns 201 + matches Order schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({ userId: 1, items: [{ productId: 1, quantity: 2 }] });
    expect(res.status).toBe(201);
    const validator = new OpenAPIResponseValidator({
      responses: spec.paths['/orders'].post.responses,
      components: { schemas: spec.components.schemas },
    });
    expect(validator.validateResponse(201, res.body)).toBeUndefined();
  });
});
