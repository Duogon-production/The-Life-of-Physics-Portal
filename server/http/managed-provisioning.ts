import 'server-only';
import { NextResponse } from 'next/server';
/** Fail closed until operator-only provisioning has an approved authorization model. */
export function managedOrganizationPOST() {
  return NextResponse.json({ error: 'Organizations are provisioned by EduLabs staff.' }, { status: 403 });
}
