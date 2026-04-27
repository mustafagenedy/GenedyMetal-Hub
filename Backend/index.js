import "dotenv/config"
import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import { dbConnection, dbDisconnect } from "./SRC/DB/dbConnection.js"
import { csrfProtect } from "./SRC/Middleware/csrf.js"
import { errorHandler, notFound } from "./SRC/Middleware/errorHandler.js"
import { globalLimiter } from "./SRC/Middleware/rateLimit.js"
import messageRouter from "./SRC/Modules/Messages/message.router.js"
import reservationRouter from "./SRC/Modules/Reservation/reservation.router.js"
import userRouter from "./SRC/Modules/User/user.router.js"

const app = express()
const port = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === "production"

// Behind a reverse proxy (Render/Vercel/Nginx), trust the first hop so
// req.ip and rate limiting see the real client.
app.set("trust proxy", 1)

// --- Security headers ---
// Explicit CSP listing the third-party origins the frontend uses today.
// 'unsafe-inline' for scripts/styles is still needed because some pages
// retain inline event handlers and inline <style> blocks; tightening
// further requires extracting those (tracked separately).
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src":  ["'self'"],
            "script-src":   ["'self'", "'unsafe-inline'",
                             "https://cdnjs.cloudflare.com",
                             "https://cdn.jsdelivr.net"],
            "style-src":    ["'self'", "'unsafe-inline'",
                             "https://cdnjs.cloudflare.com",
                             "https://fonts.googleapis.com"],
            "font-src":     ["'self'",
                             "https://fonts.gstatic.com",
                             "https://cdnjs.cloudflare.com",
                             "data:"],
            "img-src":      ["'self'", "data:", "https:"],
            "connect-src":  ["'self'", "http://localhost:3000",
                             "http://127.0.0.1:3000",
                             ...(process.env.API_ORIGIN ? [process.env.API_ORIGIN] : [])],
            "frame-ancestors": ["'none'"],
            "object-src":   ["'none'"],
            "base-uri":     ["'self'"],
            "form-action":  ["'self'"],
            "upgrade-insecure-requests": [],
        },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}))

// --- CORS allowlist (env-driven) ---
// CORS_ORIGINS=https://genedymetal.com,https://www.genedymetal.com
// In dev we allow `*` if explicitly configured, otherwise default to localhost.
const allowList = (process.env.CORS_ORIGINS || (isProd ? "" : "*"))
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)

app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true)              // server-to-server / curl
        if (allowList.includes("*")) return cb(null, true)
        if (allowList.includes(origin)) return cb(null, true)
        return cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
}))

// --- Body parsers with size limits (DoS guard) ---
app.use(express.json({ limit: "100kb" }))
app.use(express.urlencoded({ extended: true, limit: "100kb" }))
app.use(cookieParser())

// --- CSRF protection on state-changing requests (cookie-auth only) ---
app.use(csrfProtect)

// --- Global rate ceiling ---
app.use(globalLimiter)

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working!',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use("/users",        userRouter)
app.use("/reservations", reservationRouter)
app.use("/messages",     messageRouter)

// 404 handler
app.use(notFound)

// Error handling middleware (must be last)
app.use(errorHandler)

// Boot: connect to the DB first, then bind the HTTP server.
async function start() {
    try {
        await dbConnection()
    } catch (err) {
        console.error("[boot] DB connection failed, exiting:", err.message)
        process.exit(1)
    }

    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}...!`)
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
        console.log(`CORS allowlist: ${allowList.join(", ") || "(none — only same-origin)"}`)
    })

    // Graceful shutdown
    const shutdown = async (signal) => {
        console.log(`[boot] received ${signal}, shutting down`)
        server.close(async () => {
            await dbDisconnect()
            process.exit(0)
        })
        // Hard exit if cleanup hangs
        setTimeout(() => process.exit(1), 10_000).unref()
    }
    process.on("SIGINT",  () => shutdown("SIGINT"))
    process.on("SIGTERM", () => shutdown("SIGTERM"))
}

start()
