const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

exports.hashPassword = async (password) => {
    try {
        const saltRounds = 10;
        const hashed = await bcrypt.hash(password, saltRounds);
        return hashed;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Password hashing failed");
    }
};


exports.comparePassword = async (password, hashPassword) => {
    try {
        return await bcrypt.compare(password, hashPassword)
    } catch (error) {
        console.log("Error in comapring password: ", error);
    }
}


exports.generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
    );
};