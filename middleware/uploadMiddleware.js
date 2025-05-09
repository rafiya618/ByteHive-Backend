const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const isValid = allowedTypes.test(file.mimetype);
    cb(null, isValid);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
