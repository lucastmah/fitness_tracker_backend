import mongoose from 'mongoose';

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
        required: true
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
    },
    token: {
        type: String
    }
});

async function validateUsername(username:string):Promise<boolean> {
    try {
        var data = await mongoose.model("users", userSchema).findOne({username: username});
        if(data === null) return true;
        else return false;
    }   
    catch(err) {
        console.log(err);
        return false;
    }
}

async function validateEmail(email:string):Promise<boolean> {
    try {
        var data = await mongoose.model("users", userSchema).findOne({email: email});
        if(data === null) return true;
        else return false;
    }   
    catch(err) {
        console.log(err);
        return false;
    }
}

export = mongoose.model("users", userSchema)