export interface Group {
  id: string;
  name: string;
  token: string;
  tokenUpdatedAt: string; // ISO string
}

export interface NumericThreshold {
  id: string;
  fieldPath: string; // JSON path like "data.cpu" or "system.memory"
  label: string; // friendly description
  min?: number;
  max?: number;
}

export interface Service {
  id: string;
  groupId: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: { key: string; value: string }[];
  body: string;
  monitorField: string; // JSON path like "status" or "data.cpu"
  expectedValue: string; // value to compare against
  checkInterval: number; // in seconds
  responseTimeThreshold: number; // in milliseconds
  status: 'UP' | 'DOWN' | 'WARN' | 'UNKNOWN';
  lastChecked?: string;
  monitorType?: 'STATISTICAL' | 'FIELD_MATCH' | 'STATUS_ONLY';
  minRange?: number;
  maxRange?: number;
  numericThresholds?: NumericThreshold[];
}

export interface CheckHistory {
  id: string;
  serviceId: string;
  timestamp: string;
  status: 'UP' | 'DOWN' | 'WARN';
  statusCode: number;
  responseTime: number;
  fieldValue: any;
  errorMessage?: string;
}

export interface Alert {
  id: string;
  serviceId: string;
  serviceName: string;
  groupName: string;
  timestamp: string;
  type: 'STATUS_CODE' | 'RESPONSE_TIME' | 'FIELD_MISMATCH' | 'ERROR';
  message: string;
  resolved: boolean;
}

// For our awesome mock endpoints configuration
export interface MockEndpoint {
  id: string;
  path: string; // e.g. "sensor-data"
  status: number; // e.g. 200, 500
  responseTimeDelay: number; // in ms
  responseBody: string; // JSON string
}
