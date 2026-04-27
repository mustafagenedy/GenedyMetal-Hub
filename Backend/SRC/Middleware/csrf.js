import crypto from "crypto";

/**
 * Double-submit CSRF pattern.
 *
 * - The HttpOnly auth cookie can't be read by client JS, so to mount a
 *   CSRF attack the attacker would need to also know the value of a
 *   second, JS-readable cookie ("gm-csrf").
 * - Cross-site JS can't read cookies set on our origin, so the attacker
 *   can't echo it back as a header. Same-origin JS can.
 * - Server compares the value of the "gm-csrf" cookie against the
 *   "X-CSRF-Token" header. They must match.
 *
 * Mounted only on routes that are authenticated by COOKIE. Bearer-token
 * callers (curl, server-to-server) are exempt because cross-origin JS
 * cannot set the Authorization header.
 */

const CSRF_COOKIE = "gm-csrf";
const CSRF_HEADER = "x-csrf-token";

export function generateCsrfToken() {
    return crypto.randomBytes(32).toString("hex");
}

export function setCsrfCookie(res, token, isProd) {
    res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,        // intentionally readable by client JS
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

export function clearCsrfCookie(res) {
    res.clearCookie(CSRF_COOKIE, { path: "/" });
}

/**
 * Constant-time comparison to defeat timing oracles. Both values are
 * hex strings of fixed length, so equal-length compare is enough.
 */
function safeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a.length !== b.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false;
    }
}

/**
 * Express middleware. Skips:
 *   - GET / HEAD / OPTIONS (per RFC, safe methods)
 *   - Requests authenticated via Authorization: Bearer header (no cookie)
 */
export const csrfProtect = (req, res, next) => {
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        return next();
    }

    const authHeader = req.headers.authorization || "";
    const hasBearer = authHeader.startsWith("Bearer ");
    const hasAuthCookie = !!(req.cookies && req.cookies["gm-token"]);

    // Skip CSRF when the request carries no ambient credential:
    //   - No auth cookie → there's no session a malicious site can ride.
    //     This covers public POSTs like signup, signin, /messages, /reservations/create.
    //   - Bearer-only callers (curl, server-to-server) → cross-origin JS can't
    //     forge an Authorization header, so CSRF doesn't apply.
    if (!hasAuthCookie || hasBearer) return next();

    // Cookie-authenticated state-changing request → require the token.
    const cookieToken = req.cookies && req.cookies[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
        return res.status(403).json({ message: "CSRF token missing or invalid" });
    }
    next();
};
