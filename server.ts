import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import mongoose, { Model } from 'mongoose';
import user from './users';
import entries from './entries';
import helmet from 'helmet';
import bcrypt from 'bcrypt';
import validator from 'validator';
import jwt from 'jsonwebtoken';

dotenv.config();

const db_user_name:string = encodeURIComponent(process.env.USER_NAME as string);
const db_password:string = encodeURIComponent(process.env.PASSWORD as string);
const hmac_sha256_key:string = encodeURIComponent(process.env.HMAC_SHA256_KEY as string);
const database:string = encodeURIComponent("sample_analytics");

const jwtExpirySeconds = 300;

const uri = `mongodb+srv://${db_user_name}:${db_password}@fitnesscluster.xhw0osd.mongodb.net/${database}?tls=true`;

var app = express();

const expiryDate = new Date(Date.now() + 60 * 60 * 1000);

app.use(helmet());
app.use(express.json());

// create user tokens
var token = function(username:string):string {
  return jwt.sign(
  { username },
  hmac_sha256_key,
  {
    expiresIn: jwtExpirySeconds,
  }
)};

// for users to login to the app
app.post('/login', async (req: Request, resp: Response) => {
  const loginInfo = req.body;

  // ensure correct json fields are present
  try {
    var username = validator.escape(loginInfo.username);
    var password = validator.escape(loginInfo.password);
  }
  catch(err) {
    resp.status(400).end("invalid inputs");
    return;
  }

  // acquire password from corresponding username
  try {
    var loginUser = await user.findOne({username: username}, 'password');
    if(loginUser === null) {
      resp.status(400).end("username doesn't exist");
    }
    else {
      // compare passwords
      var result = await bcrypt.compare(password, loginUser.password);
      if(!result) {
        resp.status(400).end("incorrect password");
      } 
      else {
        var sessionToken = token(username);
        loginUser.token = sessionToken;
        resp.cookie("token", token, {
          secure: true,
          httpOnly: true,
          maxAge: jwtExpirySeconds * 1000
          });
        resp.status(200).end("login successful");
      }
    }
  }
  catch(err) {
    console.log(err);
    resp.status(500).end("login failed");
  }
});


// for users to create an account
app.post('/register', async (req: Request, resp: Response) => {
  const registerInfo = req.body;

  // ensure correct json fields are present
  try {
    // check inputs
    var email = validator.escape(registerInfo.email);
    if(!validator.isEmail(email)) {
      resp.status(400).end("invalid email");
      return;
    }

    var username = validator.escape(registerInfo.username);
    var password = validator.escape(registerInfo.password);
  }
  catch(err){
    resp.status(400).end("invalid inputs");
    return;
  }

  // generate password hash
  bcrypt.hash(password, 10, async function(hash_err, hash) {
    if(hash_err) {
      console.log(hash_err);
    }

    // attempt to add user
    try {
      var sessionToken = token(username);
      await user.create({
        username: username,
        email: email,
        password: hash,
        token: sessionToken
      });
      await entries.create({
        username: username
      });
      resp.cookie("token", token, {
        secure: true,
        httpOnly: true,
        maxAge: jwtExpirySeconds * 1000
      });
      resp.status(201).end("new user added");
    }
    catch(create_err) {
      resp.status(400).end("username or email already exists");
      return;
    }
  });
});

// TODO: let users submit workout entries
app.post('/new_entry', async (req: Request, resp: Response) => {
  const newEntryInfo = req.body;

  // ensure correct json fields are present
  try {
    validator.isDate(newEntryInfo.date)
    var date = new Date(newEntryInfo.date);
    var title = validator.escape(newEntryInfo.title);
    var username = validator.escape(newEntryInfo.username);
  }
  catch(err) {
    resp.status(400).end("invalid inputs");
    return;
  }

  // find an entries bucket for given user with space
  try {
    var userEntriesBucket = await entries.findOne({username: username, entryCount: { $lt: 100 }});
    if(userEntriesBucket === null) {
      await entries.create({
        username: username
      });
    }
    else {
      // console.log(userEntriesBucket);
      userEntriesBucket.entries.push({
        date: date,
        title: title
      });
      if(userEntriesBucket.entryCount === 0) {
        userEntriesBucket.bucketStartDate = date;
      }
      userEntriesBucket.bucketEndDate = date;
      userEntriesBucket.entryCount += 1;
      await userEntriesBucket.save();
      resp.status(201).end("success");
    }
  }
  catch(err) {
    console.log(err);
    resp.status(500).end("something went wrong");
  }
});

// TODO: edit entries
app.post('/update_entry', async (req: Request, resp: Response) => {
  const exerciseInfo = req.body;

  // update fields that are not null
  try {
    var username = validator.escape(exerciseInfo.username);
    var userEntriesBucket = await entries.findOne({username: username, entryCount: { $lt: 100 }});
    if(userEntriesBucket === null) {
      resp.status(404).end("user has no entries to modify");
    }
    else {
      if(typeof exerciseInfo.entryNumber === 'number') {
        var entryNumber = exerciseInfo.entryNumber;
        userEntriesBucket.entries[entryNumber].title = validator.escape(exerciseInfo.title);
        if(typeof exerciseInfo.workoutLength === 'number') {
          userEntriesBucket.entries[entryNumber].workoutLength = exerciseInfo.workoutLength;
        }
        if(validator.isDate(exerciseInfo.workoutDate)) {
          userEntriesBucket.entries[entryNumber].workoutDate = new Date(exerciseInfo.workoutDate);
        }
        var i = 0;
        while(exerciseInfo.exercises[i]) {
          var exerciseName = validator.escape(exerciseInfo.exercises[i].exerciseName);
            userEntriesBucket.entries[entryNumber].exercises.push({
              exerciseName: exerciseName
            });
          var j = 0;
          
          while(exerciseInfo.exercises[i].volume[j]) {
            if(typeof exerciseInfo.exercises[i].volume[j].repCount === 'number') {
              userEntriesBucket.entries[entryNumber].exercises[i].volume.push({
                repCount: exerciseInfo.exercises[i].volume[j].repCount,
                weight: exerciseInfo.exercises[i].volume[j].weight
              });
            }
            else {
              throw Error;
            }
            j++;
          }
          i++;
        }
        userEntriesBucket.save();
        resp.status(200).end("updated entry");
      }
      else {
        throw Error;
      }
    }
  }
  catch(err) {
    console.log(err);
    resp.status(400).end("invalid or missing inputs");
    return;
  }
});

// TODO: let users view their entries
app.get('/get_entries', async (req: Request, resp: Response) => {
  const getEntriesInfo = req.body;

  // ensure correct json fields are present
  if(typeof getEntriesInfo.currentEntry === 'number' && typeof getEntriesInfo.loadCount === 'number') {
    try {
      var username = validator.escape(getEntriesInfo.username);
      var data = await entries.find({ username: username }).sort({ bucketEndDate: 'desc' });
      
      // index to the current entry
      var tail  = 0;
      var index = 0;
      while(data[index]) {
        if(tail < getEntriesInfo.currentEntry) {
          tail += data[index].entryCount;
          index++;
        }
        else {
          break;
        }
      }
      resp.status(200).json(data[index].entries);
    }
    catch(err) {
      resp.status(500).end("database error");
    }
  }
  else {
    resp.status(400).end("invalid inputs");
  }
});

app.listen(8081, () => {
  mongoose.connect(uri);
  console.log("listening on 8081");
});