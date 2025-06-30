import cors from "cors"
import express from "express"
import { dbConnection } from "./DB/dbConnection.js"
import { errorHandler, notFound } from "./SRC/Middleware/errorHandler.js"
import messageRouter from "./SRC/Modules/Messages/message.router.js"
import reservationRouter from "./SRC/Modules/Reservation/reservation.router.js"
import userRouter from "./SRC/Modules/User/user.router.js"

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Database connection
dbConnection()

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
app.use("/users", userRouter)
app.use("/reservations", reservationRouter)
app.use("/messages", messageRouter)

// 404 handler
app.use(notFound)

// Error handling middleware (must be last)
app.use(errorHandler)

app.listen(port, () => {
    console.log(`Server is running on port ${port}...!`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})