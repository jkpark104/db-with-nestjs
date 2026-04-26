import DataLoader from 'dataloader';
import { User } from '@app/mock-data';
import { userRepo } from '../../ch01-rest-pain/repositories';

// per-request DataLoader 팩토리.
// 같은 tick에 들어온 user.load(id) 호출들을 모아 1번의 findByIds로 처리한다.
export function createUserLoader(): DataLoader<number, User | null> {
  return new DataLoader<number, User | null>(async (ids) => {
    const users = await userRepo.findByIds(ids);
    return users.map((u) => u ?? null);
  });
}
