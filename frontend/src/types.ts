export type HealthStatus = {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
};

export type ReadinessStatus = {
  status: string;
};

export type ApiInfo = {
  service: string;
  version: string;
  docs: string;
};

export type EchoResponse = {
  data: {
    message: string;
  };
  receivedAt: string;
  requestId: string;
};
