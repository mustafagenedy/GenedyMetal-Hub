import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

/**
 * Tight limiter for sensitive auth endpoints (signin / signup).
 * Returns 429 after the cap is hit — message is generic to avoid
 * giving a probing attacker a foothold.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 10 : 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Try again in a few minutes." },
});

/**
 * Looser limiter for public-write endpoints (contact form, reservations).
 * Goal: stop bot spam, not legitimate users.
 */
export const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: isProd ? 20 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many submissions. Please try again later." },
});

/**
 * Global ceiling — protects against opportunistic flooding even on
 * routes that don't have their own limiter.
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 300 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
});
