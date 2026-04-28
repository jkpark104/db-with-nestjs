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
    products: [],
    users: [
      { id: 1, email: 'test@test.com', name: 'Test User', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    orders: [],
    categories: [],
    productCategories: [],
    orderItems: [],
    reviews: [],
  })),
}));

const spec = yaml.load(fs.readFileSync('contracts/openapi.yaml', 'utf8')) as any;

describe('Contract: /users', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [Ch06RuntimeDriftModule] }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /users/:id matches OAS schema', async () => {
    const res = await request(app.getHttpServer()).get('/users/1');
    expect(res.status).toBe(200);
    const validator = new OpenAPIResponseValidator({
      responses: spec.paths['/users/{id}'].get.responses,
      components: { schemas: spec.components.schemas },
    });
    const errors = validator.validateResponse(200, res.body);
    expect(errors).toBeUndefined();
  });
});
