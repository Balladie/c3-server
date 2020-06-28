var express  = require('express');
var router   = express.Router();
var mongoose = require('mongoose');
var multer = require('multer');
var User     = require('../models/user');
var util     = require('../util');
var path = require('path');
var mv = require('mv');
var fs = require('fs');
var child_process = require('child_process');

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "images/thumbnails")
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '.jpeg')
    }
});
var upload = multer({storage: storage});

// index
router.get('/', util.isLoggedin, function(req,res,next){
  User.find({})
  .sort({username:1})
  .exec(function(err,users){
    res.json(err||!users? util.successFalse(err): util.successTrue(users));
  });
});

// create
router.post('/', function(req,res,next){
  var newUser = new User(req.body);
  newUser.save(function(err,user){
    res.json(err||!user? util.successFalse(err): util.successTrue(user));
  });
});

// show
router.get('/:username', util.isLoggedin, function(req,res,next){
  User.findOne({username:req.params.username})
  .exec(function(err,user){
    res.json(err||!user? util.successFalse(err): util.successTrue(user));
  });
});

// Register a video
router.post('/registervideo/:username', util.isLoggedin, function(req, res, next) {
    User.findOne({username: req.params.username})
    .exec(function(err, user) {
        if (!user || err || !req.body.title || req.body.title == '')
            return res.json(util.successFalse(err));

        // check if available number left
        if (user.availableRegisterCount <= 0) {
            return res.json({"title": ""});
        }

        var newVideo = {
            title: req.body.title,
            madeAt: req.body.madeAt,
            registeredAt: req.body.registeredAt,
            contentDescription: req.body.contentDescription,
            keywords: req.body.keywords,
            platforms: req.body.platforms,
            size: req.body.size,
            duration: req.body.duration,
            resolution: req.body.resolution
        };

        console.log("*********************");
        console.log(user.videoList);
        console.log("*********************");

        user.videoList.push(newVideo);
        user.availableRegisterCount -= 1;
        user.save((err) => {
            if (err)
                return res.json(util.successFalse(err));
        });

        console.log("*********************");
        console.log(user.videoList);
        console.log("*********************");

        return res.json(newVideo);
    });
});

// Upload thumbnail
router.post('/image/:username/:registeredAt', util.isLoggedin, upload.single('file'), function(req, res, next) {
    console.log("image upload request from: " + req.params.username);

    var uploaded = req.file;
    var tempPath = path.join(__dirname.substring(0, __dirname.lastIndexOf("/api")), uploaded.path);
    console.log("tempPath: " + tempPath);
    var targetPath = path.join(__dirname.substring(0, __dirname.lastIndexOf("/api")), "images/thumbnails", req.params.username + "_" + req.params.registeredAt + ".jpeg");
    console.log("targetPath: " + targetPath);

    var exec = child_process.exec;
    try {
        exec("mv " + tempPath + " " + targetPath, (err, stdout, stderr) => {
            if (err) return res.json(util.successFalse(err));
            if (stdout) console.log("stdout: " + stdout);
            if (stderr) console.log("stderr: " + stderr);
        });
    } catch (e) {
        console.log(e);
        return res.json(util.successFalse(e));
    }

    console.log("Success on uploading thumbnail.");
    return res.status(200).json(util.successTrue(uploaded));
});

// get thumbnail
router.get('/thumbnail/:username/:registeredAt', util.isLoggedin, function(req, res, next) {
    console.log("image request from: " + req.params.username);
    console.log("registeredAt: " + req.params.registeredAt);

    User.findOne({username:req.params.username})
    .select({videoList:1})
    .exec(function(err, user) {
        if (err || !user) return res.json(util.successFalse(err));

        var thumbnailPath = path.join(__dirname.substring(0, __dirname.lastIndexOf("/api")), "images/thumbnails/" + req.params.username + "_" + req.params.registeredAt + ".jpeg");
        return res.sendFile(thumbnailPath);
    });
});

// update
router.put('/:username', util.isLoggedin, checkPermission, function(req,res,next){
  User.findOne({username:req.params.username})
  .select({password:1})
  .exec(function(err,user){
    if(err||!user) return res.json(util.successFalse(err));

    // update user object
    user.originalPassword = user.password;
    user.password = req.body.newPassword? req.body.newPassword: user.password;
    for(var p in req.body){
      user[p] = req.body[p];
    }

    // save updated user
    user.save(function(err,user){
      if(err||!user) return res.json(util.successFalse(err));
      else {
        user.password = undefined;
        res.json(util.successTrue(user));
      }
    });
  });
});

// destroy
router.delete('/:username', util.isLoggedin, checkPermission, function(req,res,next){
  User.findOneAndRemove({username:req.params.username})
  .exec(function(err,user){
    res.json(err||!user? util.successFalse(err): util.successTrue(user));
  });
});

module.exports = router;

// private functions
function checkPermission(req,res,next){
  User.findOne({username:req.params.username}, function(err,user){
    if(err||!user) return res.json(util.successFalse(err));
    else if(!req.decoded || user._id != req.decoded._id)
      return res.json(util.successFalse(null,'You don\'t have permission'));
    else next();
  });
}
