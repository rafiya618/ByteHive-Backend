import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const hashPassword = async (password) => {
    try {
        const saltRounds = 10;
        const hashed = await bcrypt.hash(password, saltRounds);
        return hashed;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Password hashing failed");
    }
};

export const comparePassword = async (password, hashPassword) => {
    try {
        return await bcrypt.compare(password, hashPassword);
    } catch (error) {
        console.log("Error in comparing password:", error);
    }
};

export const generateToken = (user) => {
    return jwt.sign(
        { _id: user._id, email: user.email, onboardingStep: user.onboardingStep},
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};
