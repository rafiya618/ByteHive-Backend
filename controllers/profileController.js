const Profile = require('../models/profileModel');
const cloudinary = require('../helpers/cloudinary');
const streamifier = require('streamifier');

exports.getProfile = async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.userId }).populate('user', 'name email');
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const updates = req.body;

        if (req.file?.buffer) {
            const streamUpload = () => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'profile_images' },
                        (error, result) => {
                            if (result) {
                                resolve(result);
                            } else {
                                reject(error);
                            }
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
            };

            const result = await streamUpload();
            updates.profileImage = result.secure_url;
        }

        
        // ✅ Normalize socialLinks keys with consistent casing
        if (
            'socialLinks[Linkedin]' in updates ||
            'socialLinks[Github]' in updates ||
            'socialLinks[X]' in updates ||
            'socialLinks[Youtube]' in updates ||
            'socialLinks[Instagram]' in updates ||
            'socialLinks[Facebook]' in updates ||
            'socialLinks[Threads]' in updates ||
            'socialLinks[Websites]' in updates
        ) {
            updates.socialLinks = {
                Linkedin: updates['socialLinks[Linkedin]'] || '',
                Github: updates['socialLinks[Github]'] || '',
                X: updates['socialLinks[X]'] || '',
                Youtube: updates['socialLinks[Youtube]'] || '',
                Instagram: updates['socialLinks[Instagram]'] || '',
                Facebook: updates['socialLinks[Facebook]'] || '',
                Threads: updates['socialLinks[Threads]'] || '',
                Websites: updates['socialLinks[Websites]'] || '',
            };

            // ✅ Clean up flattened keys
            [
                'Linkedin', 'Github', 'X', 'Youtube',
                'Instagram', 'Facebook', 'Threads', 'Websites'
            ].forEach(key => delete updates[`socialLinks[${key}]`]);
        }
        

        const profile = await Profile.findOneAndUpdate(
            { user: req.params.userId },
            { $set: { ...updates, user: req.params.userId } },
            { new: true, upsert: true }
        );

        res.json(profile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
};
