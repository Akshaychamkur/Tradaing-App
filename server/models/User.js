import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const UserSchema = new mongoose.Schema({
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

UserSchema.pre('save', async function () {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});
UserSchema.pre('save', async function () {
    if (this.isModified('login_pin')) {
        const salt = await bcrypt.genSalt(10);
        this.login_pin = await bcrypt.hash(this.login_pin, salt);
    }
});

UserSchema.statics.updatePIN = async function (email, newPin) {
    try {
        const user = await this.findOne({ email });
        if (!user) {
            throw new NotFoundError('User not found');
        }
        const isSamePIN = await bcrypt.compare(newPin, user.login_pin);
        if (isSamePIN) {
            throw new BadRequestError('New PIN cannot be the same as the old PIN');
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(newPin, salt);

        await this.findOneAndUpdate({ email }, { login_pin: hashedPin, wrong_pin_attempts: 0, blocked_until_pin: null }
        );

        return { success: true, message: 'PIN updated successfully' };


    } catch (error) {
        throw error;
    }
};

UserSchema.statics.updatePassword = async function (email, newPassword) {
    try {
        const user = await this.findOne({ email });
        if (!user) {
            throw new NotFoundError('User not found');
        }
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new BadRequestError('New password cannot be the same as the old password');
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await this.findOneAndUpdate({ email }, { password: hashedPassword, wrong_password_attempts: 0, blocked_until_password: null }
        );

        return { success: true, message: 'Password updated successfully' };

    } catch (error) {
        throw error;
    }
};

UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (this.blocked_until_password && this.blocked_until_password > new Date()) {
        throw new UnAuthenticatedError(`Invalid Login attempts. Try again after 30 minutes.`);
    }

    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    if (!isMatch) {
        this.wrong_password_attempts += 1;
        if (this.wrong_password_attempts >= 3) {
            this.blocked_until_password = new Date(Date.now() + 30 * 60 * 1000); // Block for 30 minutes
            this.wrong_password_attempts = 0; // Reset attempts after blocking
        }
        await this.save();
    } else {
        this.wrong_password_attempts = 0;
        this.blocked_until_password = null;
        await this.save();
    }
    return isMatch;

};

UserSchema.methods.comparePin = async function (candidatePin) {
    if (this.blocked_until_pin && this.blocked_until_pin > new Date()) {
        throw new UnAuthenticatedError(`Invalid PIN attempts. Try again after 30 minutes.`);
    }

    const hashedPIN = this.login_pin;
    const isMatch = await bcrypt.compare(candidatePin, hashedPIN);
    if (!isMatch) {
        this.wrong_pin_attempts += 1;
        if (this.wrong_pin_attempts >= 3) {
            this.blocked_until_pin = new Date(Date.now() + 30 * 60 * 1000); // Block for 30 minutes
            this.wrong_pin_attempts = 0; // Reset attempts after blocking
        }
        await this.save();
    } else {
        this.wrong_pin_attempts = 0;
        this.blocked_until_pin = null;
        await this.save();
    }
    return isMatch;

}

UserSchema.methods.createAccessToken = function () {
    return jwt.sign({ userId: this._id, name: this.name }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
};

UserSchema.methods.createRefreshToken = function () {
    return jwt.sign({ userId: this._id, name: this.name }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
};




const User = mongoose.model('User', userSchema);

export default User;

