import User from "../../models/User";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError, UnauthenticatedError } from "../../errors/index.js";
import jwt from "jsonwebtoken";
import User from "../../models/User";

const register = async (req, res) => {
    const { email, password, register_token } = req.body;
    if (!email || !password || !register_token) {
        throw new BadRequestError("Please provide all values");
    }

    const User = await User.findOne({ email });
    if (User) {
        throw new BadRequestError("Email already in use");
    }
    if (register_token !== process.env.REGISTER_TOKEN) {
        throw new BadRequestError("Invalid register token");
    }
    try {
        const payload = jwt.verify(register_token, process.env.REGISTER_SECRET);
        if (payload.email !== email) {
            throw new BadRequestError("Invalid register token");
        }

        const newUser = new User({ email, password });
        const access_token = newUser.createAccessToken();
        const refresh_token = newUser.createRefreshToken();
        await newUser.save();
        res.status(StatusCodes.CREATED).json({ User: { email: newUser.email, userId: newUser._id }, tokens: { access_token, refresh_token } });
    } catch (err) {
        console.error("Error during registration:", err);
        throw new BadRequestError("Invalid register token");
    }
};


const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequestError("Please provide all values");
    }

    const User = await User.find({ email });
    if (!User) {
        throw new UnauthenticatedError("User not found");
    }

    const isPasswordCorrect = await User.comparePassword(password);
    if (!isPasswordCorrect) {
        let message;

        if (User.blocked_until_password && User.blocked_until_password > new Date()) {
            const remainingTime = Math.ceil((User.blocked_until_password - new Date()) / (60 * 1000));
            message = `Invalid Login attempts. Try again after ${remainingTime} minutes.`;
        } else {
            const attemptsRemaining = 3 - User.wrong_password_attempts;
            message = attemptsRemaining > 0
                ? `Invalid password. You have ${attemptsRemaining} more attempt(s) before your account is temporarily blocked.`
                : `Invalid Login attempts. Try again after 30 minutes.`;
        }
        throw new UnauthenticatedError(message);
    }

    const access_token = User.createAccessToken();
    const refresh_token = User.createRefreshToken();

    let phone_exists = false;
    let login_pin_exists = false;

    if (User.phone) {
        phone_exists = true;
    }
    if (User.login_pin) {
        login_pin_exists = true;
    }

    res.status(StatusCodes.OK).json
        ({ User: { name: User.name, email: User.email, userId: User._id, phone_exists, login_pin_exists }, tokens: { access_token, refresh_token } });
};

async function generateRefreshTokens(
    token,
    refresh_secret,
    refresh_expiry,
    access_secret,
    access_expiry
){
    try{
        const payload = jwt.verify(token, refresh_secret);
        
    }
}


export { register, login };

