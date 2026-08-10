import { IsIn, IsString, MinLength } from 'class-validator';
import {
  INVITABLE_MEMBERSHIP_ROLES,
  MembershipRole,
  type InvitableMembershipRole,
} from '@vdb/shared-types';

const ASSIGNABLE_ROLES = [
  MembershipRole.Admin,
  MembershipRole.Editor,
  MembershipRole.Viewer,
] as const;

/** Invite roles — never OWNER. */
export class CreateInvitationDto {
  @IsString()
  @MinLength(8)
  mobile!: string;

  @IsIn([...INVITABLE_MEMBERSHIP_ROLES])
  role!: InvitableMembershipRole;
}

export class UpdateMemberRoleDto {
  @IsIn([...ASSIGNABLE_ROLES])
  role!: (typeof ASSIGNABLE_ROLES)[number];
}
