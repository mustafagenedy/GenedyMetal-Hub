import mongoose from "mongoose";

export function dbConnection(){
    mongoose.connect("mongodb://127.0.0.1:27017/test10").then(() => {
        console.log("Connected Successfully!")
    })
    .catch((err) => {
        console.log("Failed to connect!", err)
    })
}