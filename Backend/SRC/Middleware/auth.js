import jwt from "jsonwebtoken";
import User from "../../DB/Model/user.model.js";

export const auth = async (req, res, next) => {
    try {
        const { authorization } = req.headers;
        
        if (!authorization) {
            return res.status(401).json({ message: "Authorization header required" });
        }

        const token = authorization.replace("Bearer ", "");
        const decoded = jwt.verify(token, "MostafaGenidyMohamed");
        
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

export const adminAuth = async (req, res, next) => {
    try {
        const { authorization } = req.headers;
        
        if (!authorization) {
            return res.status(401).json({ message: "Authorization header required" });
        }

        const token = authorization.replace("Bearer ", "");
        const decoded = jwt.verify(token, "MostafaGenidyMohamed");
        
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        if (user.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
}; 