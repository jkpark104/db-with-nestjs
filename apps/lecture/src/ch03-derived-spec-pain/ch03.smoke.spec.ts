import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import request from 'supertest';
import { ContractStatusInterceptor } from '../common/contract-status.interceptor';
import { Ch03DerivedSpecPainModule } from './ch03.module';

jest.mock('@app/mock-data', () => ({
  initStore: jest.fn(),
  getStore: jest.fn(() => ({
    products: [
      { id: 1, name: 'Test Product', priceInWon: 10000, stock: 5, description: 'desc', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    users: [],
    orders: [],
    categories: [],
    productCategories: [],
    orderItems: [],
    reviews: [],
  })),
}));

describe('Ch03 derived-spec-pain smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [Ch03DerivedSpecPainModule],
      providers: [{ provide: APP_INTERCEPTOR, useClass: ContractStatusInterceptor }],
    }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /products/1 → 200 + category present + header code-derived', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('category');
    expect(res.headers['x-contract-status']).toBe('code-derived');
  });
});
