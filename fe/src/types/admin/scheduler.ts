// ============================================
// Admin Scheduler Management Types
// ============================================

export interface SchedulerJobResponse {
  jobName?: string;
  status?: string;
  message?: string;
  [key: string]: any;
}

export interface SchedulerStatusResponse {
  schedulerEnabled?: boolean;
  jobs?: string[];
  message?: string;
  [key: string]: any;
}
