import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/contract/**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@app/mock-data(|/.*)$': '<rootDir>/libs/mock-data/src/$1',
    '^@contracts/generated$': '<rootDir>/contracts/generated/be-types.ts',
    '^@contracts/(.*)$': '<rootDir>/contracts/$1',
  },
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
};
export default config;
