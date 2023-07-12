import mongoose from 'mongoose';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        validate: {
            validator: (v:string) => validateUsername(v),
            message: 'this username is taken',
        },
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        validate: {
            validator: (v:string) => validateEmail(v),
            message: 'this email is already in use',
        },
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        set: (v:string) => encodePassword(v)
    },
    salt: {
        type: Buffer,
        required: true,
        immutable: true
    },
    createdOn: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    },
    updatedOn: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    }
});

function encodePassword(password:string) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function validateUsername(username:string):boolean {
    return (mongoose.model("users", userSchema).findOne({username: username}) === null ? false : true);
}

function validateEmail(email:string):boolean {
    return (mongoose.model("users", userSchema).findOne({email: email}) === null ? false : true);
}

export = mongoose.model("users", userSchema)