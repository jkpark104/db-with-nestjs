type Chapter = 'ch02' | 'ch03' | 'ch04' | 'ch05' | 'ch06' | 'ch07';
const fromEnv = import.meta.env.VITE_CHAPTER as Chapter | undefined;
export const ACTIVE_CHAPTER: Chapter = fromEnv ?? 'ch02';
