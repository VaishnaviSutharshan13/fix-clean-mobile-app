// Complaint / dispute lifecycle managed by administrators (FR8):
// open → in review → resolved. A complaint can also be resolved straight from
// "open" (e.g. a duplicate). Resolved complaints are final.
export enum ComplaintStatus {
  Open = 'open',
  InReview = 'in_review',
  Resolved = 'resolved',
}

export const COMPLAINT_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  [ComplaintStatus.Open]: [ComplaintStatus.InReview, ComplaintStatus.Resolved],
  [ComplaintStatus.InReview]: [ComplaintStatus.Resolved],
  [ComplaintStatus.Resolved]: [],
};

export function canTransitionComplaint(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return COMPLAINT_TRANSITIONS[from].includes(to);
}

export enum ComplaintCategory {
  ServiceQuality = 'service_quality',
  NoShow = 'no_show',
  Pricing = 'pricing',
  Behaviour = 'behaviour',
  Damage = 'damage',
  Other = 'other',
}
