"use strict";

const promClient = require("prom-client");

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register, prefix: "mcc_api_" });

const httpRequestDuration = new promClient.Histogram({
  name: "mcc_api_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

const httpRequestTotal = new promClient.Counter({
  name: "mcc_api_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);

const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequestTotal.inc(labels);
    end(labels);
  });
  next();
};

const metricsEndpoint = async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
};

module.exports = { metricsMiddleware, metricsEndpoint };