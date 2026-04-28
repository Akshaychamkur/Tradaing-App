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

const refreshToken = async (req, res) => {
    const { type, refresh_token } = req.body;
    if (!type || !["socket", "app"].includes(type) || !refresh_token) {
        throw new BadRequestError("Please provide all values");
    }
    try {

        let accessToken, newRefreshToken;
        if (type === "socket") {
            ({ accessToken, newRefreshToken } = await generateRefreshTokens(
                refresh_token,
                process.env.REFRESH_SOCKET_TOKEN_SECRET,
                process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
                process.env.SOCKET_TOKEN_SECRET,
                process.env.SOCKET_TOKEN_EXPIRY
            ));
        } else if (type === "app") {
            ({ accessToken, newRefreshToken } = await generateRefreshTokens(
                refresh_token,
                process.env.REFRESH_APP_TOKEN_SECRET,
                process.env.REFRESH_SOCKET_TOKEN_EXPIRY,
                process.env.JWT_SECRET,
                process.env.ACCESS_TOKEN_EXPIRY
            ));
        }
        res.status(StatusCodes.OK).json({ access_token: accessToken, refresh_token: newRefreshToken });
    }
    catch (err) {
        console.error("Error refreshing token:", err);
        throw new UnauthenticatedError("Invalid token");
    }
};

async function generateRefreshTokens(
    token,
    refresh_secret,
    refresh_expiry,
    access_secret,
    access_expiry
) {
    try {
        const payload = jwt.verify(token, refresh_secret);
        const user = await User.findById(payload.userId);
        if (!user) {
            throw new NotFoundError("User not found");
        }
        const access_token = jwt.sign({ userId: payload.userId }, access_secret, { expiresIn: access_expiry });
        const newRefreshToken = jwt.sign({ userId: payload.userId }, refresh_secret, { expiresIn: refresh_expiry });
        return { access_token, newRefreshToken };
    }
    catch (err) {
        console.error("Error generating refresh token:", err);
        throw new UnauthenticatedError("Invalid token");
    }
}

const logout = async (req, res) => {
    const accessToken = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.decode(accessToken, process.env.JWT_SECRET);
    const userId = decodedToken.userId;
    await User.updateOne(({ _id: userId }, { $unset: { biometricKey: 1 } }));
    res.status(StatusCodes.OK).json({ message: "Logged out successfully" });
};


    export { register, login, refreshToken, logout };
