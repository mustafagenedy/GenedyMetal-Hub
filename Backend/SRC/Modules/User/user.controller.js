import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Message from "../../DB/Model/message.model.js";
import Reservation from "../../DB/Model/reservation.model.js";
import User from "../../DB/Model/user.model.js";
import {
    clearCsrfCookie,
    generateCsrfToken,
    setCsrfCookie,
} from "../../Middleware/csrf.js";

const isProd = process.env.NODE_ENV === "production";

function setAuthCookie(res, token) {
    res.cookie("gm-token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

function clearAuthCookie(res) {
    res.clearCookie("gm-token", { path: "/" });
}

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET is missing or too weak in production");
        }
        return secret || "dev-only-please-change-me-immediately";
    }
    return secret;
}

const BCRYPT_COST = Math.max(parseInt(process.env.BCRYPT_COST || "12", 10), 10);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Generic credential failure — never leak which side was wrong.
const CREDENTIALS_INVALID = "Invalid email or password";

//signup
export const signup = async (req, res) => {
    try {
        const { fullName, phone, password } = req.body;
        const email = String(req.body.email || "").trim().toLowerCase();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Don't confirm "user exists" to anonymous probes — keep the response shape
            // identical to the success path and let the client handle the post-submit UX.
            return res.status(409).json({ message: "Account already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

        const newUser = new User({
            fullName,
            email,
            phone,
            password: hashedPassword
        });
        await newUser.save();

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                fullName: newUser.fullName,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role
            }
        });
    } catch (err) {
        console.error("[user] signup error:", err.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};


//signin
export const signin = async (req, res) => {
    try {
        const password = req.body.password;
        const email = String(req.body.email || "").trim().toLowerCase();

        if (!email || !password) {
            return res.status(400).json({ message: CREDENTIALS_INVALID });
        }

        const user = await User.findOne({ email });
        if (!user) {
            // Do a dummy bcrypt compare to keep response timing stable
            await bcrypt.compare(password, "$2b$12$" + "x".repeat(53));
            return res.status(401).json({ message: CREDENTIALS_INVALID });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: CREDENTIALS_INVALID });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            getJwtSecret(),
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Set the HttpOnly auth cookie + a CSRF token in a JS-readable cookie.
        setAuthCookie(res, token);
        const csrf = generateCsrfToken();
        setCsrfCookie(res, csrf, isProd);

        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            // `token` retained for backwards compatibility with anything still
            // reading from the response body. Cookie is the source of truth.
            token,
            csrfToken: csrf,
            user: {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('[user] signin error:', error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Get user profile
export const getUserProfile = async (req, res) => {
    try {
        // User is already authenticated and available in req.user
        const user = req.user;
        
        return res.status(200).json({
            success: true,
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            message: "Profile retrieved successfully"
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

// Admin: Get user stats
export const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
        const usersByRole = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
        const recentUsers = await User.find({}, { fullName: 1, email: 1, createdAt: 1, role: 1 })
            .sort({ createdAt: -1 })
            .limit(5);
        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                newUsersThisMonth,
                usersByRole,
                recentUsers
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Admin: Get extended user analytics
export const getUserAnalytics = async (req, res) => {
    try {
        // 1. User growth (last 12 months)
        const now = new Date();
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                label: d.toLocaleString('default', { month: 'short', year: '2-digit' })
            });
        }
        const userGrowth = await Promise.all(months.map(async m => {
            const start = new Date(m.year, m.month - 1, 1);
            const end = new Date(m.year, m.month, 1);
            const count = await User.countDocuments({ createdAt: { $gte: start, $lt: end } });
            return { ...m, count };
        }));

        // 2. Active vs. inactive users (active = last login or reservation/message in 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Assume last login is not tracked, so use reservation/message activity
        const activeUserIds = new Set();
        const recentReservations = await Reservation.find({ createdAt: { $gte: thirtyDaysAgo } }, 'user');
        recentReservations.forEach(r => r.user && activeUserIds.add(r.user.toString()));
        const recentMessages = await Message.find({ createdAt: { $gte: thirtyDaysAgo } }, 'user');
        recentMessages.forEach(m => m.user && activeUserIds.add(m.user.toString()));
        const activeUsers = await User.countDocuments({ _id: { $in: Array.from(activeUserIds) } });
        const totalUsers = await User.countDocuments();
        const inactiveUsers = totalUsers - activeUsers;

        // 3. Top users by reservations/messages
        const topUsersReservations = await Reservation.aggregate([
            { $group: { _id: "$user", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: "$user" },
            { $project: { fullName: "$user.fullName", email: "$user.email", count: 1 } }
        ]);
        const topUsersMessages = await Message.aggregate([
            { $group: { _id: "$user", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: "$user" },
            { $project: { fullName: "$user.fullName", email: "$user.email", count: 1 } }
        ]);

        // 4. Registration by day of week
        const regByDay = await User.aggregate([
            { $project: { dayOfWeek: { $dayOfWeek: "$createdAt" } } },
            { $group: { _id: "$dayOfWeek", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                userGrowth,
                activeUsers,
                inactiveUsers,
                topUsersReservations,
                topUsersMessages,
                regByDay
            }
        });
    } catch (error) {
        console.error('[user] analytics error:', error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Logout — clears auth + CSRF cookies. Idempotent.
export const logout = async (req, res) => {
    clearAuthCookie(res);
    clearCsrfCookie(res);
    return res.status(200).json({ success: true, message: "Logged out" });
};

// Mint a fresh CSRF token (also useful when the cookie expires
// independent of the auth token, or for the "remember me" flow).
export const issueCsrf = async (req, res) => {
    const csrf = generateCsrfToken();
    setCsrfCookie(res, csrf, isProd);
    return res.status(200).json({ csrfToken: csrf });
};

// Admin: list every user (paginated, password-stripped). Replaces the
// admin frontend's previous broken call to GET /users/all.
function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
        const search = req.query.search;

        const query = {};
        if (search) {
            const safe = escapeRegex(search);
            query.$or = [
                { fullName: { $regex: safe, $options: "i" } },
                { email:    { $regex: safe, $options: "i" } },
            ];
        }

        const users = await User.find(query, { password: 0 })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: users,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                total,
            },
        });
    } catch (error) {
        console.error("[user] getAllUsers error:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};