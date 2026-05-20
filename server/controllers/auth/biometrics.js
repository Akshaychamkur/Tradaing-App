import User from "../../models/User";
import { BadRequestError, UnauthenticatedError } from "../../errors/index.js";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken"
import NodeRSA from "node-rsa";

const uploadBiometrics = async (req, res) => {
    const { public_key } = req.body;
    if (!public_key) {
        throw new BadRequestError("Please provide public key");
    }
    const accessToken = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const updatedUser = await User.findByIdAndUpdate(userId, { biometricKey: public_key },
        { new: true, runValidators: true });
    res.status(StatusCodes.OK).json({ msg: "Biometric key uploaded successfully" });
};

const verifyBiometrics = async (req, res) => {
    const { signature } = req.body;
    if (!signature) {
        throw new BadRequestError("Please provide signature");
    }
    const accessToken = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const user = await User.findById(userId);
    if (!user || !user.biometricKey) {
        throw new UnauthenticatedError("Biometric authentication not set up");
    }

    const isVerifyingSignature = await verifySignature(signature, user.id, user.biometricKey);

    if (!isVerifyingSignature) {
        throw new UnauthenticatedError("Invalid biometric signature");
    }

    const access_token = jwt.sign
        ({ userId: userId },
            process.env.SOCKET_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });

    res.status(StatusCodes.OK).json({ msg: "Biometric authentication successful", access_token });

    const refresh_token = jwt.sign({ userId: userId },
        process.env.REFRESH_SOCKET_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_SOCKET_TOKEN_EXPIRY });

    user.blocked_until_pin = null;
    user.wrong_pin_attempts = 0;
    await user.save();
    res.status(StatusCodes.OK)
        .json({
            success: true, socket_tokens:
                { socket_access_token: access_token, socket_refresh_token: refresh_token }
        });
};

async function verifySignature(signature, payload, publickey) {
    const publicKeyBuffer = Buffer.from(publickey, "base64");
    const key = new NodeRSA();
    const signedData = key.importKey(publicKeyBuffer, "public-der");
    const signatureVerified = signedData.verify(
        Buffer.from(payload),
        signature,
        "utf8",
        "base64"
    );
    return signatureVerified;
}

export { uploadBiometrics, verifyBiometrics };