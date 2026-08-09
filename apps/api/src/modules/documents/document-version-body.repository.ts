import { Injectable } from '@nestjs/common';
import type { Collection, Db } from 'mongodb';
import {
  parseDocumentBody,
  type DocumentBody,
} from '@vdb/document-schema';
import { MongoService } from '../../config/mongo/mongo.service';

export type DocumentVersionBodyDoc = DocumentBody & {
  versionId: string;
  createdAt: Date;
};

const COLLECTION = 'document_version_bodies';

@Injectable()
export class DocumentVersionBodyRepository {
  constructor(private readonly mongo: MongoService) {}

  private async col(): Promise<Collection<DocumentVersionBodyDoc>> {
    const db: Db = await this.mongo.getDb();
    return db.collection<DocumentVersionBodyDoc>(COLLECTION);
  }

  async ensureIndexes(): Promise<void> {
    const col = await this.col();
    await col.createIndex(
      { businessId: 1, versionId: 1 },
      { unique: true, name: 'business_version_unique' },
    );
    await col.createIndex(
      { businessId: 1, documentId: 1, createdAt: -1 },
      { name: 'business_document_created' },
    );
  }

  async insert(input: {
    versionId: string;
    body: DocumentBody;
  }): Promise<void> {
    const col = await this.col();
    const now = new Date();
    await col.insertOne({
      ...input.body,
      versionId: input.versionId,
      createdAt: now,
    } as DocumentVersionBodyDoc);
  }

  async find(
    businessId: string,
    versionId: string,
  ): Promise<DocumentBody | null> {
    const col = await this.col();
    const doc = await col.findOne({ businessId, versionId });
    if (!doc) return null;
    const { versionId: _v, createdAt: _c, ...rest } = doc;
    void _v;
    void _c;
    return parseDocumentBody(rest);
  }

  async deleteForDocument(
    businessId: string,
    documentId: string,
  ): Promise<void> {
    const col = await this.col();
    await col.deleteMany({ businessId, documentId });
  }
}
