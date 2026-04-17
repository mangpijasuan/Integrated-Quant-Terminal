import pinoHttp from "pino-http";

export const httpLogger = pinoHttp({
  quietReqLogger: true,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[REDACTED]",
  },
});
