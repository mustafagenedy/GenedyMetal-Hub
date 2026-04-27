import mongoose from "mongoose";

/**
 * Connects to MongoDB.
 * - Reads MONGODB_URI from the environment.
 * - In production, refuses to start without one (fail fast).
 * - In development, falls back to a local URI but logs a clear warning.
 * - Returns the mongoose connection promise so the caller can await it
 *   before binding the HTTP server.
 */
export async function dbConnection() {
    const env = process.env.NODE_ENV || "development";
    const uri = process.env.MONGODB_URI || (env === "production"
        ? null
        : "mongodb://127.0.0.1:27017/genedy_metal_dev");

    if (!uri) {
        const msg = "MONGODB_URI is not set. Refusing to start in production without an explicit DB URI.";
        console.error(`[db] ${msg}`);
        throw new Error(msg);
    }

    // Mask credentials before logging the connection target.
    const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
    console.log(`[db] connecting to ${safeUri} (env=${env})`);

    mongoose.set("strictQuery", true);

    const conn = mongoose.connection;
    conn.on("connected",    () => console.log("[db] connected"));
    conn.on("disconnected", () => console.warn("[db] disconnected"));
    conn.on("reconnected",  () => console.log("[db] reconnected"));
    conn.on("error",        (err) => console.error("[db] error:", err.message));

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
    });

    return mongoose.connection;
}

/** Closes the active mongoose connection — call from SIGINT/SIGTERM handlers. */
export async function dbDisconnect() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log("[db] connection closed");
    }
}
