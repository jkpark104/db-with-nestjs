import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CallCounterInterceptor } from './common/call-counter.interceptor';

// 학습 중인 챕터 모듈 하나만 활성화한다.
// 다른 챕터로 이동할 때는 import 배열에서 교체.
// import { Ch01RestModule } from './ch01-rest-pain/ch01.module';
// import { Ch02GraphQLModule } from './ch02-graphql-basics/ch02.module';
// import { Ch03DataGraphModule } from './ch03-data-graph/ch03.module';
// import { Ch04DataLoaderModule } from './ch04-n-plus-one/ch04.module';
import { Ch05SubscriptionModule } from './ch05-client-operations/ch05.module';

@Module({
  imports: [
    // Ch01RestModule,
    // Ch02GraphQLModule,
    // Ch03DataGraphModule,
    // Ch04DataLoaderModule,
    Ch05SubscriptionModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CallCounterInterceptor,
    },
  ],
})
export class AppModule {}
