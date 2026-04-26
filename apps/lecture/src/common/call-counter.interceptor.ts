import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CallCounter } from '@app/mock-data';

@Injectable()
export class CallCounterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<{
      setHeader?: (name: string, value: string) => void;
    } | null>();

    return new Observable((subscriber) => {
      CallCounter.run(() => {
        const subscription = next.handle().subscribe({
          next: (value) => {
            const counter = CallCounter.current();
            if (counter && response?.setHeader) {
              response.setHeader('x-mock-db-calls', counter.toHeader());
            }
            subscriber.next(value);
          },
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
        return () => subscription.unsubscribe();
      });
    });
  }
}
