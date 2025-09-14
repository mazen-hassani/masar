// Enums matching backend enums
export enum Role {
  PMO = 'PMO',
  PM = 'PM',
  TEAM_MEMBER = 'TEAM_MEMBER',
  CLIENT = 'CLIENT'
}

export enum Status {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TrackingStatus {
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  DELAYED = 'DELAYED',
  CRITICAL = 'CRITICAL'
}

export enum DependencyType {
  FS = 'FS', // Finish to Start
  SS = 'SS', // Start to Start
  FF = 'FF', // Finish to Finish
  SF = 'SF'  // Start to Finish
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}