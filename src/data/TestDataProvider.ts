export interface TestDataProvider {
  get<T>(key: string): Promise<T>;
}
