import express from "express";
import { adminAuth, auth } from "../../Middleware/auth.js";
import { authLimiter } from "../../Middleware/rateLimit.js";
import { validation } from "../../Middleware/validation.js";
import {
    getAllUsers,
    getUserAnalytics,
    getUserProfile,
    getUserStats,
    issueCsrf,
    logout,
    signin,
    signup,
} from "./user.controller.js";
import { signinSchema, signupSchema } from "./user.validation.js";

const userRouter = express.Router();

userRouter.post("/signup", authLimiter, validation(signupSchema), signup);
userRouter.post("/signin", authLimiter, validation(signinSchema), signin);
userRouter.post("/logout", logout);
userRouter.get("/csrf",    issueCsrf);

userRouter.get("/profile",   auth, getUserProfile);
userRouter.get("/all",       adminAuth, getAllUsers);
userRouter.get("/stats",     adminAuth, getUserStats);
userRouter.get("/analytics", adminAuth, getUserAnalytics);

export default userRouter;