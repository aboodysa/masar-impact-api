import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const enabled = process.env.AUTH_ENABLED === 'true';
    if (!enabled) return true;

    const request = context.switchToHttp().getRequest();
    const auth = request.headers.authorization;

    if (!auth || !auth.startsWith('Bearer ')) return false;

    const token = auth.split(' ')[1];
    const expected = process.env.API_TOKEN || 'dev-token';
    return token === expected;
  }
}
