import { Injectable } from '@nestjs/common';
import type { Collection, Db } from 'mongodb';
import {
  parseDocumentBody,
  type DocumentBody,
} from '@vdb/document-schema';
import { MongoService } from '../../config/mongo/mongo.service';

export type DocumentBodyDoc = DocumentBody & {
  updatedAt: Date;
  /** Legacy v2 field — ignored after upgrade. */
  blocks?: unknown;
};

const COLLECTION = 'document_bodies';

@Injectable()
export class DocumentBodyRepository {
  constructor(private readonly mongo: MongoService) {}

  private async col(): Promise<Collection<DocumentBodyDoc>> {
    const db: Db = await this.mongo.getDb();
    return db.collection<DocumentBodyDoc>(COLLECTION);
  }

  async ensureIndexes(): Promise<void> {
    const col = await this.col();
    await col.createIndex(
      { businessId: 1, documentId: 1 },
      { unique: true, name: 'business_document_unique' },
    );
  }

  async upsert(body: DocumentBody): Promise<void> {
    const col = await this.col();
    const now = new Date();
    await col.updateOne(
      { businessId: body.businessId, documentId: body.documentId },
      {
        $set: {
          schemaVersion: body.schemaVersion,
          businessId: body.businessId,
          documentId: body.documentId,
          templateId: body.templateId,
          title: body.title,
          dataRefs: body.dataRefs,
          page: body.page,
          masters: body.masters,
          pages: body.pages,
          updatedAt: now,
        },
        $unset: { blocks: '' },
      },
      { upsert: true },
    );
  }

  async find(
    businessId: string,
    documentId: string,
  ): Promise<DocumentBody | null> {
    const col = await this.col();
    const doc = await col.findOne({ businessId, documentId });
    if (!doc) return null;
    return parseDocumentBody(doc);
  }

  async delete(businessId: string, documentId: string): Promise<void> {
    const col = await this.col();
    await col.deleteOne({ businessId, documentId });
  }
}
