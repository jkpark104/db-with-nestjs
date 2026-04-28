import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import request from 'supertest';
import { ContractStatusInterceptor } from '../common/contract-status.interceptor';
import { Ch01DocDriftModule } from './ch01.module';

jest.mock('@app/mock-data', () => ({
  initStore: jest.fn(),
  getStore: jest.fn(() => ({
    products: [
      { id: 1, name: 'Test Product', priceInWon: 10000, stock: 5, description: 'desc', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    users: [
      { id: 1, email: 'test@test.com', name: 'Test User', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    categories: [],
    productCategories: [],
    orders: [],
    orderItems: [],
    reviews: [],
  })),
}));

describe('Ch01 doc-drift smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [Ch01DocDriftModule],
      providers: [{ provide: APP_INTERCEPTOR, useClass: ContractStatusInterceptor }],
    }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /products/1 → 200, priceInWon present, header not-tracked', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('priceInWon');
    expect(typeof res.body.priceInWon).toBe('number');
    expect(res.headers['x-contract-status']).toBe('not-tracked');
  });

  it('GET /users/1 → 200, header not-tracked', async () => {
    const res = await request(app.getHttpServer()).get('/users/1');
    expect(res.status).toBe(200);
    expect(res.headers['x-contract-status']).toBe('not-tracked');
  });
});
