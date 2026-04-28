import 'reflect-metadata';
import OpenAPIResponseValidator from 'openapi-response-validator';
import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Ch06RuntimeDriftModule } from '../../apps/lecture/src/ch06-runtime-drift/ch06.module';

jest.mock('@app/mock-data', () => ({
  initStore: jest.fn(),
  getStore: jest.fn(() => ({
    products: [
      { id: 1, name: 'Test Product', priceInWon: 10000, stock: 5, description: 'desc', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 2, name: 'Another Product', priceInWon: 5000, stock: 10, description: 'desc2', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    users: [],
    orders: [],
    categories: [],
    productCategories: [],
    orderItems: [],
    reviews: [],
  })),
}));

const spec = yaml.load(fs.readFileSync('contracts/openapi.yaml', 'utf8')) as any;

describe('Contract: /products', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [Ch06RuntimeDriftModule] }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /products list matches OAS schema', async () => {
    const res = await request(app.getHttpServer()).get('/products');
    expect(res.status).toBe(200);
    const validator = new OpenAPIResponseValidator({
      responses: spec.paths['/products'].get.responses,
      components: { schemas: spec.components.schemas },
    });
    const errors = validator.validateResponse(200, res.body);
    expect(errors).toBeUndefined();
  });

  it('GET /products/:id matches OAS schema (priceInWon 표준)', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    const validator = new OpenAPIResponseValidator({
      responses: spec.paths['/products/{id}'].get.responses,
      components: { schemas: spec.components.schemas },
    });
    const errors = validator.validateResponse(200, res.body);
    expect(errors).toBeUndefined();
  });
});
