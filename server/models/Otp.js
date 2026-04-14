import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {mailSender} from "../utils/mailSender.js";

const OtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60*5, // OTP expires after 5 minutes
    },
    otp_type: {
        type: String,
        enum: ['phone', 'email', 'reset_password', 'reset_pin'],
        required: true,
    }
});

otpSchema.pre('save', async function (next) {
    if(!this.isNew) {
        const salt = await bcrypt.genSalt(10);
        await sendverificationMail(this.email, this.otp);
        this.otp = await bcrypt.hash(this.otp, salt);
    }
    next();
});
otpSchema.methods.compareOtp = async function (enteredOtp) {
    return await bcrypt.compare(enteredOtp, this.otp);
};



async function sendverificationMail(email, otp, otp_type) {
    try{
        const mailResponse = await mailSender(email,otp, otp_type);
    }catch(err) {
        console.error("Error sending OTP email:", err);
        throw err;
    }
};