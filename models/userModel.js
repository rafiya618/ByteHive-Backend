const mongoose = require('mongoose')


const { Schema, model } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        default: null
    },
    googleId: {
        type: String,
        default: null
    },
    role: {
        type: Number,
        default: 0
    },
}, { timestamps: true })

exports.userModel = model("User", userSchema);