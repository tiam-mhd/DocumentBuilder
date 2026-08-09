export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export type StoredObject = {
  key: string;
  contentType: string;
  byteSize: number;
};

export interface ObjectStorage {
  readonly driver: 'local' | 's3';
  put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredObject>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
  /** Absolute or API-relative URL hint for debugging; auth still via Nest for local. */
  publicUrlHint(key: string): string | null;
}
