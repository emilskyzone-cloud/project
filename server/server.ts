import "./configs/instrument.mjs";
import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";
import clerkWebhooks from "./controllers/clerk.js";
import * as Sentry from "@sentry/node";
import userRouter from "./routes/userRoutes.js";
import projectRouter from "./routes/projectRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

const defaultClientOrigins = [
    "https://aimaker.tech",
    "https://www.aimaker.tech",
    "https://aimaker-web-free.onrender.com",
    "http://localhost:5173",
];

const allowedOrigins = new Set(
    (process.env.CLIENT_ORIGINS || defaultClientOrigins.join(","))
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
);

// Middleware
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow server-to-server calls and same-machine health checks.
            if (!origin || allowedOrigins.has(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Origin not allowed by CORS"));
        },
    })
);

// Clerk webhooks require the raw request body for signature verification.
app.post("/api/clerk", express.raw({ type: "application/json" }), clerkWebhooks);

app.use(express.json({ limit: "1mb" }));
app.use(clerkMiddleware());

app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "aimaker-api" });
});

app.use("/api/user", userRouter);
app.use("/api/project", projectRouter);

// Capture unexpected errors after all routes.
Sentry.setupExpressErrorHandler(app);

app.listen(PORT, () => {
    console.log(`AI Maker API listening on port ${PORT}`);
});
