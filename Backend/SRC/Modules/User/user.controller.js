import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Message from "../../../DB/Model/message.model.js";
import Reservation from "../../../DB/Model/reservation.model.js";
import User from "../../../DB/Model/user.model.js";

//signup
export const signup = async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists, try logging in" });
        }

        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 8);
        console.log("Hashed password:", hashedPassword);
        
        console.log("Inserting user...");
        const newUser = new User({ 
            fullName, 
            email, 
            phone,
            password: hashedPassword 
        });
        await newUser.save();
        console.log("User inserted.");

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
        console.error("Signup error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};


//signin
export const signin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found, try signing up" });
        }
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "Invalid password" });
        }
        
        const token = jwt.sign(
            {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                id: user._id,
            },
            "MostafaGenidyMohamed"
        );
        
        return res.status(200).json({ 
            success: true,
            message: "User logged in successfully", 
            token,
            user: {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Signin error:', error);
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
        console.error('Get user analytics error:', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};