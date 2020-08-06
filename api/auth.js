var express  = require('express');
var router   = express.Router();
var User     = require('../models/user');
var util     = require('../util');
var jwt      = require('jsonwebtoken');

// login
router.post('/login',
  function(req,res,next){
    console.log('Login request from: ' + req.body.email);
    var isValid = true;
    var validationError = {
      name:'ValidationError',
      errors:{}
    };

    if(!req.body.email){
      isValid = false;
      validationError.errors.email = {message:'Email is required!'};
    }
    if(!req.body.password){
      isValid = false;
      validationError.errors.password = {message:'Password is required!'};
    }

    if(!isValid) return res.json(util.successFalse(validationError));
    else next();
  },
  function(req,res,next){
    User.findOne({email:req.body.email})
    .select({password:1,username:1,name:1,email:1})
    .exec(function(err,user){
      if(err) return res.json(util.successFalse(err));
      else if(!user||!user.authenticate(req.body.password))
         return res.json(util.successFalse(null,'Username or Password is invalid'));
      else {
        var payload = {
          _id : user._id,
          username: user.email
        };
        var secretOrPrivateKey = "c3jwtsecret";
        var options = {expiresIn: 60*60*24};
        jwt.sign(payload, secretOrPrivateKey, options, function(err, token){
          if(err) return res.json(util.successFalse(err));
          console.log("Login successful on email: " + user.email);
          res.json(util.successTrue(token));
        });
      }
    });
  }
);

// me
router.get('/me', util.isLoggedin,
  function(req,res,next) {
    User.findById(req.decoded._id)
    .exec(function(err,user){
      if(err||!user) return res.json(util.successFalse(err));
      res.json(util.successTrue(user));
    });
  }
);

// refresh
router.get('/refresh', util.isLoggedin,
  function(req,res,next) {
    User.findById(req.decoded._id)
    .exec(function(err,user){
      if(err||!user) return res.json(util.successFalse(err));
      else {
        var payload = {
          _id : user._id,
          username: user.username
        };
        var secretOrPrivateKey = "c3jwtsecret";
        var options = {expiresIn: 60*60*24};
        jwt.sign(payload, secretOrPrivateKey, options, function(err, token){
          if(err) return res.json(util.successFalse(err));
          res.json(util.successTrue(token));
        });
      }
    });
  }
);

module.exports = router;
