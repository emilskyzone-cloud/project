import multer from "multer";

const storage = multer.diskStorage({});

const upload = multer({
    storage,
    limits: {
        files: 2,
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith("image/")) {
            return callback(new Error("Only image files are accepted."));
        }
        callback(null, true);
    },
});

export default upload;
