'use client';

import { useMemo } from 'react';
import {
  MembershipPermissionCodes,
  permissionsForRole,
  roleHasPermission,
  type MembershipPermissionCode,
} from '@vdb/shared-types';
import { useBusinesses } from '@/shared/lib/business-context';

export function useMembershipPermissions() {
  const { activeBusiness } = useBusinesses();
  const role = activeBusiness?.role;

  return useMemo(() => {
    const permissions = role ? permissionsForRole(role) : [];
    const can = (code: MembershipPermissionCode | string) =>
      role ? roleHasPermission(role, code) : false;

    return {
      role: role ?? null,
      permissions,
      can,
      canManageData: can(MembershipPermissionCodes.ManageData),
      canManageTemplates: can(MembershipPermissionCodes.ManageTemplates),
      canManageAssets: can(MembershipPermissionCodes.ManageAssets),
      canManageThemes: can(MembershipPermissionCodes.ManageThemes),
      canManageDocuments: can(MembershipPermissionCodes.ManageDocuments),
      canExportPdf: can(MembershipPermissionCodes.ExportPdf),
      canPublish: can(MembershipPermissionCodes.DocumentsPublish),
      canManageSettings: can(MembershipPermissionCodes.ManageSettings),
      canManageMembers: can(MembershipPermissionCodes.ManageMembers),
      canManageBilling: can(MembershipPermissionCodes.ManageBilling),
      canManageBackup: can(MembershipPermissionCodes.ManageBackup),
      canReadAudit: can(MembershipPermissionCodes.AuditRead),
    };
  }, [role]);
}
