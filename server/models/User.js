import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    password: {
        type: String,
    },
    name: {
        type: String,
        maxlength: 50,
        minlength: 3,
    },
    login_pin: {
        type: String,
        maxlength: 4,
        minlength: 4,
    },
    phone_number: {
        type: String,
        match: [/^[0-9]{10}$/, 'Please fill a valid 10-digit phone number'],
        unique: true,
        sparse: true, // Allows for unique constraint on optional field
    },
    date_of_birth: Date,
    biometricKey: String,
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
    wrong_pin_attempts: {
        type: Number,
        default: 0,
    },
    blocked_until_pin: {
        type: Date,
        default: null,
    },
    wrong_password_attempts: {
        type: Number,
        default: 0,
    },
    blocked_until_password: {
        type: Date,
        default: null,
    },
    balance: {
        type: Number,
        default: 50000.0,
    }
},
{
    timestamps: true,
});
