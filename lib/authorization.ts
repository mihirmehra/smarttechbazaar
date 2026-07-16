import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@/models/User";

export interface AuthorizedSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    image?: string;
  };
}

export async function getAuthorizedSession(
  requiredRoles: UserRole[] = ["admin", "super_admin"]
): Promise<AuthorizedSession | null> {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return null;
  }
  
  if (!requiredRoles.includes(session.user.role)) {
    return null;
  }
  
  return session as AuthorizedSession;
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFoundResponse(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequestResponse(message = "Bad request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function canDelete(role: UserRole): boolean {
  return role === "super_admin";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "super_admin";
}

export function canManageSettings(role: UserRole): boolean {
  return role === "super_admin";
}

export function canViewActivityLog(role: UserRole): boolean {
  return role === "super_admin";
}
