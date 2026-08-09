import { HttpStatus, Injectable } from '@nestjs/common';
import {
  OrgChartErrorCodes,
  parseContentLocale,
  pickLocalized,
  type PublicOrgChartNode,
  type PublicOrgChartTree,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

const MEMBER_LOCALIZED_FIELDS = ['name', 'roleTitle', 'department'] as const;

@Injectable()
export class OrgChartService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(input: {
    businessId: string;
    rootMemberId?: string | null;
    locale?: string;
  }): Promise<PublicOrgChartTree> {
    const locale = parseContentLocale(input.locale);
    const rows = await this.prisma.teamMember.findMany({
      where: { businessId: input.businessId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 500,
    });

    const byId = new Map(
      rows.map((r) => {
        const loc = pickLocalized(
          {
            name: r.name,
            roleTitle: r.roleTitle,
            department: r.department,
          },
          r.translations,
          locale,
          MEMBER_LOCALIZED_FIELDS,
        );
        return [
          r.id,
          {
            id: r.id,
            name: loc.name,
            roleTitle: loc.roleTitle,
            department: loc.department,
            photoMediaId: r.photoMediaId,
            parentMemberId: r.parentMemberId,
            sortOrder: r.sortOrder,
            children: [] as PublicOrgChartNode[],
          } satisfies PublicOrgChartNode,
        ] as const;
      }),
    );

    const roots: PublicOrgChartNode[] = [];
    for (const node of byId.values()) {
      const parentId = node.parentMemberId;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.children.push(node);
      } else {
        node.parentMemberId = null;
        roots.push(node);
      }
    }

    const rootMemberId = input.rootMemberId?.trim() || null;
    if (rootMemberId) {
      const root = byId.get(rootMemberId);
      if (!root) {
        throw new DomainException(
          OrgChartErrorCodes.RootNotFound,
          'Root team member not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        roots: [root],
        rootMemberId,
        memberCount: this.countNodes([root]),
      };
    }

    return {
      roots,
      rootMemberId: null,
      memberCount: rows.length,
    };
  }

  private countNodes(nodes: PublicOrgChartNode[]): number {
    let n = 0;
    for (const node of nodes) {
      n += 1 + this.countNodes(node.children);
    }
    return n;
  }
}
