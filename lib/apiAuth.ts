import { NextResponse } from 'next/server';
import { getSessionUser } from './getSessionUser';
import { parsePermissions, canInsert, canWrite, canDelete } from './permissions';

type AuthError = { res: NextResponse };
type AuthOk = { user: { id: string; role: string; permissions: string } };

async function getAuth(): Promise<AuthError | AuthOk> {
  const user = await getSessionUser();
  if (!user) return { res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { user: { id: user.id, role: user.role, permissions: user.permissions ?? '{}' } };
}

export async function requireInsert(module: string): Promise<AuthError | AuthOk> {
  const auth = await getAuth();
  if ('res' in auth) return auth;
  const perms = parsePermissions(auth.user.permissions);
  if (!canInsert(perms, module, auth.user.role))
    return { res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return auth;
}

export async function requireWrite(module: string): Promise<AuthError | AuthOk> {
  const auth = await getAuth();
  if ('res' in auth) return auth;
  const perms = parsePermissions(auth.user.permissions);
  if (!canWrite(perms, module, auth.user.role))
    return { res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return auth;
}

export async function requireDelete(module: string): Promise<AuthError | AuthOk> {
  const auth = await getAuth();
  if ('res' in auth) return auth;
  const perms = parsePermissions(auth.user.permissions);
  if (!canDelete(perms, module, auth.user.role))
    return { res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return auth;
}
