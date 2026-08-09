import { Injectable } from '@nestjs/common';
import type { Collection, Db } from 'mongodb';
import {
  parseTemplateBody,
  type TemplateBody,
} from '@vdb/document-schema';
import { MongoService } from '../../config/mongo/mongo.service';

export type TemplateBodyDoc = TemplateBody & {
  updatedAt: Date;
  blocks?: unknown;
};

const COLLECTION = 'template_bodies';

@Injectable()
export class TemplateBodyRepository {
  constructor(private readonly mongo: MongoService) {}

  private async col(): Promise<Collection<TemplateBodyDoc>> {
    const db: Db = await this.mongo.getDb();
    return db.collection<TemplateBodyDoc>(COLLECTION);
  }

  async ensureIndexes(): Promise<void> {
    const col = await this.col();
    await col.createIndex(
      { businessId: 1, templateId: 1 },
      { unique: true, name: 'business_template_unique' },
    );
  }

  async upsert(body: TemplateBody): Promise<void> {
    const col = await this.col();
    const now = new Date();
    await col.updateOne(
      { businessId: body.businessId, templateId: body.templateId },
      {
        $set: {
          schemaVersion: body.schemaVersion,
          businessId: body.businessId,
          templateId: body.templateId,
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
    templateId: string,
  ): Promise<TemplateBody | null> {
    const col = await this.col();
    const doc = await col.findOne({ businessId, templateId });
    if (!doc) return null;
    return parseTemplateBody(doc);
  }

  async delete(businessId: string, templateId: string): Promise<void> {
    const col = await this.col();
    await col.deleteOne({ businessId, templateId });
  }
}
