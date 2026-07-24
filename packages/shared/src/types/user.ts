export type UserRole = "user" | "admin";
export type AuthProvider = "google" | "magic_link";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  authProvider: AuthProvider;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export type OrgMemberRole = "owner" | "admin" | "member";

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgMemberRole;
  invitedAt: string;
  joinedAt: string | null;
}
