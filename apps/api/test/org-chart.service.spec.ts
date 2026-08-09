import { OrgChartService } from '../src/modules/content/org-chart.service';

describe('OrgChartService', () => {
  function setup(rows: Array<{
    id: string;
    name: string;
    roleTitle?: string;
    department?: string;
    photoMediaId?: string | null;
    parentMemberId?: string | null;
    sortOrder?: number;
    createdAt?: Date;
  }>) {
    const prisma = {
      teamMember: {
        findMany: jest.fn().mockResolvedValue(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            roleTitle: r.roleTitle ?? '',
            department: r.department ?? '',
            photoMediaId: r.photoMediaId ?? null,
            parentMemberId: r.parentMemberId ?? null,
            sortOrder: r.sortOrder ?? 0,
            createdAt: r.createdAt ?? new Date(),
          })),
        ),
      },
    };
    return { service: new OrgChartService(prisma as never), prisma };
  }

  it('builds a vertical reporting tree', async () => {
    const { service } = setup([
      { id: 'ceo', name: 'CEO', sortOrder: 0 },
      { id: 'cto', name: 'CTO', parentMemberId: 'ceo', sortOrder: 1 },
      { id: 'dev', name: 'Dev', parentMemberId: 'cto', sortOrder: 0 },
      { id: 'orphan', name: 'Contractor', parentMemberId: 'missing' },
    ]);
    const tree = await service.getTree({ businessId: 'biz_1' });
    expect(tree.memberCount).toBe(4);
    expect(tree.roots.map((r: { id: string }) => r.id).sort()).toEqual([
      'ceo',
      'orphan',
    ]);
    const ceo = tree.roots.find((r: { id: string }) => r.id === 'ceo')!;
    expect(ceo.children).toHaveLength(1);
    expect(ceo.children[0]!.id).toBe('cto');
    expect(ceo.children[0]!.children[0]!.id).toBe('dev');
  });

  it('filters to a subtree root', async () => {
    const { service } = setup([
      { id: 'ceo', name: 'CEO' },
      { id: 'cto', name: 'CTO', parentMemberId: 'ceo' },
      { id: 'dev', name: 'Dev', parentMemberId: 'cto' },
    ]);
    const tree = await service.getTree({
      businessId: 'biz_1',
      rootMemberId: 'cto',
    });
    expect(tree.rootMemberId).toBe('cto');
    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0]!.id).toBe('cto');
    expect(tree.memberCount).toBe(2);
  });
});
