import express from "express";
import client from "prom-client";
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
} from "./store.js";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

function routeLabel(req) {
  return req.route?.path ?? req.path;
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.use((req, res, next) => {
    const stop = httpDuration.startTimer();
    res.on("finish", () => {
      const labels = {
        method: req.method,
        route: routeLabel(req),
        status: String(res.statusCode),
      };
      httpRequests.inc(labels);
      stop(labels);
    });
    next();
  });

  app.get("/", (_req, res) => {
    res.json({
      service: "devsecops-demo-api",
      version: process.env.APP_VERSION ?? "0.1.0",
    });
  });

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/readyz", (_req, res) => {
    res.json({ status: "ready" });
  });

  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  });

  app.get("/items", (_req, res) => {
    res.json(listItems());
  });

  app.post("/items", (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    res.status(201).json(createItem(name));
  });

  app.get("/items/:id", (req, res) => {
    const item = getItem(req.params.id);
    if (!item) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(item);
  });

  app.put("/items/:id", (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const item = updateItem(req.params.id, name);
    if (!item) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(item);
  });

  app.delete("/items/:id", (req, res) => {
    if (!deleteItem(req.params.id)) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(204).end();
  });

  return app;
}
