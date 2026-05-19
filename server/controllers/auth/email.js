import User from "../../models/User.js";
import OTP from "../../models/OTP.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../errors/index.js";
import { generateOTP } from "../../services/mailSender.js";

const checkEmail = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new BadRequestError("Please provide email");
    }

    let isExist = true;

    let user = await User.find({ email });
    if (!user) {
        const otp = await generateOTP();
        await OTP.create({ email, otp, otp_type: "email" });
        isExist = false;
    }
    res.status(StatusCodes.OK).json({ msg: "OTP sent to email", isExist });
};  

export { checkEmail };