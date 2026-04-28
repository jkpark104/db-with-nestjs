import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CallCounterInterceptor } from './common/call-counter.interceptor';
import { ContractStatusInterceptor } from './common/contract-status.interceptor';
// import { Ch01DocDriftModule } from './ch01-doc-drift/ch01.module';
// import { Ch02CodeFirstSwaggerModule } from './ch02-code-first-swagger/ch02.module';
import { Ch03DerivedSpecPainModule } from './ch03-derived-spec-pain/ch03.module';
// import { Ch04DesignFirstModule } from './ch04-design-first/ch04.module';
// import { Ch05ParallelBlockingModule } from './ch05-parallel-blocking/ch05.module';
// import { Ch06RuntimeDriftModule } from './ch06-runtime-drift/ch06.module';
// import { Ch07GeneratedHooksModule } from './ch07-generated-hooks/ch07.module';
// import { Ch08SpecCompatModule } from './ch08-spec-compat/ch08.module';

@Module({
  imports: [
    Ch03DerivedSpecPainModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: CallCounterInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ContractStatusInterceptor },
  ],
})
export class AppModule {}
