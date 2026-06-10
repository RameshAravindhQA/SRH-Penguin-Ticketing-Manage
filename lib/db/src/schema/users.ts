export type Department = {
  id: number;
  name: string;
  description: string | null;
  headId: number | null;
  documentPrefix: string | null;
  ticketEnabled: boolean;
  ticketSequencePrefix: string | null;
  routineSequencePrefix: string | null;
  projectSequencePrefix: string | null;
  taskSequencePrefix: string | null;
  mobileNumbers: string | null;
  isHousekeeping: boolean;
  legacyDepartmentId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Role = {
  id: number;
  name: string;
  description: string | null;
  level: number;
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  passwordHash: string;
  mobile: string | null;
  departmentId: number | null;
  designation: string | null;
  role: string;
  roleId: number | null;
  reportingManagerId: number | null;
  avatarUrl: string | null;
  status: string;
  userType: string | null;
  wardUid: number | null;
  spaceName: string | null;
  isHardwareUser: boolean;
  isCallCenterUser: boolean;
  legacyUserId: number | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDepartmentAssignment = {
  id: number;
  userId: number;
  departmentId: number;
  activeFrom: Date | null;
  activeTo: Date | null;
  createdAt: Date;
};

export type UserReportingAssignment = {
  id: number;
  userId: number;
  reportingUserId: number;
  activeFrom: Date | null;
  activeTo: Date | null;
  createdAt: Date;
};

export type InsertUser = Omit<User, "id" | "createdAt" | "updatedAt">;
export type InsertDepartment = Omit<Department, "id" | "createdAt" | "updatedAt">;
export type InsertRole = Omit<Role, "id" | "createdAt" | "updatedAt">;
