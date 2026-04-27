import jwt from "jsonwebtoken";
import User from "../DB/Model/user.model.js";

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === "dev-only-change-me" || secret.length < 32) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET is missing or too weak in production");
        }
        // Loud dev warning so this can't ship by accident
        if (!global.__jwtSecretWarned) {
            console.warn("[auth] JWT_SECRET is unset or weak — using dev-only placeholder. Set a 48+ byte random value before production.");
            global.__jwtSecretWarned = true;
        }
        return secret || "dev-only-please-change-me-immediately";
    }
    return secret;
}

async function verifyAndAttachUser(req) {
    // Prefer the HttpOnly cookie set by /users/signin.
    // Fall back to Authorization: Bearer for tooling / scripts.
    const cookieToken = req.cookies && req.cookies["gm-token"];
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : (authHeader || "");

    const token = cookieToken || bearerToken;
    if (!token) {
        const err = new Error("Authentication required");
        err.status = 401;
        throw err;
    }

    let decoded;
    try {
        decoded = jwt.verify(token, getJwtSecret());
    } catch {
        const err = new Error("Invalid or expired token");
        err.status = 401;
        throw err;
    }

    const user = await User.findById(decoded.id);
    if (!user) {
        const err = new Error("User not found");
        err.status = 401;
        throw err;
    }

    req.user = user;
    return user;
}

export const auth = async (req, res, next) => {
    try {
        await verifyAndAttachUser(req);
        next();
    } catch (error) {
        return res.status(error.status || 401).json({ message: error.message });
    }
};

export const adminAuth = async (req, res, next) => {
    try {
        const user = await verifyAndAttachUser(req);
        if (user.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }
        next();
    } catch (error) {
        return res.status(error.status || 401).json({ message: error.message });
    }
};
