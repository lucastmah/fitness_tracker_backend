import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import mongoose, { Model } from 'mongoose';
import user from './users';
import helmet from 'helmet';
import crypto from 'crypto';

dotenv.config();

const user_name:string = encodeURIComponent(process.env.USER_NAME as string);
const password:string = encodeURIComponent(process.env.PASSWORD as string);
var database:string = encodeURIComponent("sample_analytics");

const uri = `mongodb+srv://${user_name}:${password}@fitnesscluster.xhw0osd.mongodb.net/${database}?tls=true`;

var app = express();

const expiryDate = new Date(Date.now() + 60 * 60 * 1000);

app.use(helmet());
app.use(express.json());

// for users to login to the app
app.post('/login', async (req: Request, resp: Response) => {
  const loginInfo = req.body;
  // acquire salt for corresponding username
  user.findOne({username: loginInfo.username}, 'salt')
    .then((response) => {
      // username was not found
      if(!response) {
        resp.status(200).end("username doesn't exist");
      } 
      
      // check if password is correct with corresponding valid username
      else {
        user.findOne({
          username: loginInfo.username,
          password: loginInfo.password + response.salt
        })
        .then((response) => {
          if(!response) {
            resp.status(200).end("incorrect password");
          } 
          
          else {
            resp.status(200).end("logged in!");
          }
        });
      }
    })
    .catch((err) => {
      console.log(err);
      resp.send("request failed");
    });
  // resp.status(200).end("logged in");
});

// for users to create an account
app.put('/register', async (req: Request, resp: Response) => {
  const registerInfo = req.body;
  // generate salt
  const new_salt = crypto.randomBytes(256).toString('base64');

  // attempt to add user
  user.create({
    username: registerInfo.username,
    email: registerInfo.email,
    password: registerInfo.password + new_salt,
    salt: new_salt
  })
  .then((data) => {
    console.log(data.username);
    resp.status(200).end("success");
  })
  .catch((reason) => {
    if(reason.keyPattern.username === 1) {
      resp.status(200).end("username already exists");
    }
    else if(reason.keyPattern.email === 1) {
      resp.status(200).end("email already exists");
    }
  });
});

// TODO: let users submit workout entries

// TODO: let users view their entries

app.listen(8081, () => {
  mongoose.connect(uri);
  console.log("listening on 8081");
});