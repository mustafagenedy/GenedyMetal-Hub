import express from "express";
import { auth } from "../../Middleware/auth.js";
import { validation } from "../../Middleware/validation.js";
import { getUserAnalytics, getUserProfile, getUserStats, signin, signup } from "./user.controller.js";
import { signinSchema, signupSchema } from "./user.validation.js";

const userRouter = express.Router();

userRouter.post("/signup",validation(signupSchema) ,signup)
userRouter.post("/signin",validation(signinSchema) ,signin)
userRouter.get("/profile", auth, getUserProfile)
userRouter.get("/stats", auth, getUserStats)
userRouter.get("/analytics", getUserAnalytics)

export default userRouter;