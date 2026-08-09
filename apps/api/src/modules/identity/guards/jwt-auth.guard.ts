import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../../common/errors/domain.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ??
        new DomainException(
          AuthErrorCodes.AuthRequired,
          'Authentication required',
          HttpStatus.UNAUTHORIZED,
        )
      );
    }
    return user;
  }
}
