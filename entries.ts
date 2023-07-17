import mongoose from 'mongoose';

const volumeSchema = new mongoose.Schema({
    // for lifting weights
    repCount: {
        type: Number
    },
    weight: {
        type: Number
    },
    // for time based exercises
    time: {
        type: Number
    }
}, {
    _id: false
});

const exerciseSchema = new mongoose.Schema({
    exerciseName: {
        type: String,
        required: true
    },
    volume: {
        type: [volumeSchema]
    }
}, {
    _id: false
});

const entrySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        lowercase: true
    },
    exercises: {
        type: [exerciseSchema],
        required: true
    },
    workoutDate: {
        type: Date,
        required: true,
        default: () => Date.now()
    },
    workoutLength: {
        type: Number
    }
});

const entriesSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true
    },
    entryCount: {
        type: Number,
        required: true,
        default: 0
    },
    bucketStartDate: {
        type: Date
    },
    bucketEndDate: {
        type: Date
    },
    entries: {
        type: [entrySchema]
    }
}, {
    versionKey: false
})

export = mongoose.model("entries", entriesSchema)