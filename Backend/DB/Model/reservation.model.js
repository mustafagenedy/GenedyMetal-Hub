import mongoose from "mongoose"

const reservationSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    visitType: {
        type: String,
        enum: ["consultation", "follow-up", "emergency", "routine", "other"],
        required: true,
    },
    preferredDate: {
        type: Date,
    },
    preferredTime: {
        type: String,
        enum: ["morning", "afternoon", "evening"],
    },
    address: {
        type: String,
    },
    notes: {
        type: String,
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "completed"],
        default: "pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
},
{
    timestamps: true
})

const Reservation = mongoose.model("Reservation", reservationSchema)
export default Reservation 