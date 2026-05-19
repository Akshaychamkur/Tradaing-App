import User from "../../models/User";
import OTP from "../../models/OTP";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../errors/index.js";
import { generateOTP } from "../../services/mailSender";
import e from "express";

const verifyOtp = async (req, res) => {
    const { email, otp, otp_type, data } = req.body;
    if (!email || !otp || !otp_type) {
        throw new BadRequestError("Please provide all values");
    } else if (otp_type !== "email" && !data) {
        throw new BadRequestError("Please provide all values");
    }

    const otpRecord = await OTP.findOne({ email, otp_type }).sort({ createdAt: -1 }).limit(1);

    if (!otpRecord) {
        throw new BadRequestError("Invalid OTP");
    }

    const isVerified = await otpRecord.compareOTP(otp);
    if (!isVerified) {
        throw new BadRequestError("Invalid OTP");
    }

    await OTP.findByIdAndDelete(otpRecord.id);

    switch (otp_type) {
        case "phone":
            await User.findOneAndUpdate({ email }, { phone_number: data });
            break;
        case "email":
            break;
        case "reset_pin":
            if (!data || data.length !== 4) {
                throw new BadRequestError("Please provide a valid 4 digit pin");
            }
            await User.updatePIN(email, data);
            break;
        case "reset_password":
            if (!data || data.length < 6) {
                throw new BadRequestError("Please provide a valid password with minimum 6 characters");
            }
            await User.updatePassword(email, data);
            break;
        default:
            throw new BadRequestError("Invalid OTP type");
    }
    const user = await User.findOne({ email });

    if (otp_type === "email" && !user) {

        const register_token = jwt.sign({ email }, process.env.REGISTER_SECRET, { expiresIn: process.env.REGISTER_SECRET_EXPIRY });

        return res.status(StatusCodes.OK).json({ msg: "Email verified successfully", register_token });
    }
    res.status(StatusCodes.OK).json({ msg: "OTP verified successfully" });
};

const sendOtp = async (req, res) => {
    const { email, otp_type } = req.body;
    if (!email || !otp_type) {
        throw new BadRequestError("Please provide all values");
    }

    const User = await User.findOne({ email });

    if (!User && otp_type == "phone") {
        throw new BadRequestError("User not found");
    }

    if (otp_type == "email" && User) {
        throw new BadRequestError("User already exists");
    }
    if (otp_type === "phone" && User.phone_number) {
        throw new BadRequestError("Phone number already exists");
    }

    const otp = await generateOTP();

    const otpPayload = new OTP({ email, otp, otp_type });
    await OTP.create(otpPayload);

    res.status(StatusCodes.OK).json({ msg: "OTP sent successfully" });
};

export { verifyOtp, sendOtp };