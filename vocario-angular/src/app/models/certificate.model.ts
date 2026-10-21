export interface Certificate {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  userEmail?: string;
  cefrLevel: string;
  certificateCode: string;
  title: string;
  issueDate: string;
  masteredWordsCount: number;
  streakCount: number;
  status: 'ISSUED' | 'PENDING' | 'REVOKED' | 'DRAFT';
  approvedBy: string;
}

export interface ClaimCertificateRequest {
  cefrLevel: string;
}

export interface ApproveCertificateRequest {
  adminName?: string;
}

export interface CertificateType {
  id: string;
  typeCode: string;
  title: string;
  cefrLevel: string;
  requiredWords: number;
  requiredStreak: number;
  description?: string;
  approvedBy: string;
  badgeColor?: string;
  isActive: boolean;
  totalIssued: number;
  createdAt: string;
}

export interface CreateCertificateTypeRequest {
  typeCode: string;
  title: string;
  cefrLevel: string;
  requiredWords: number;
  requiredStreak: number;
  description?: string;
  approvedBy?: string;
  badgeColor?: string;
  isActive?: boolean;
}

export interface UpdateCertificateTypeRequest {
  title?: string;
  cefrLevel?: string;
  requiredWords?: number;
  requiredStreak?: number;
  description?: string;
  approvedBy?: string;
  badgeColor?: string;
  isActive?: boolean;
}

