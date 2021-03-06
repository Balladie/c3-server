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
var mysql = require('mysql');

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
router.get('/:email', util.isLoggedin, function(req,res,next){
  User.findOne({email:req.params.email})
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

        user.videoList.push(newVideo);
        user.availableRegisterCount -= 1;
        user.save((err) => {
            if (err)
                console.log(err);
        });

        // send video info to web server
        var connection = mysql.createConnection({
            host: '175.125.94.153',
            user: 'kopca',
            password: 'kopca7748?',
            database: 'kopcadb'
        });
        connection.connect();
        connection.query(`INSERT INTO cr (cr_name, cr_username, cr_url, cr_title, cr_registeredAt, cr_size, cr_duration, cr_resolution) VALUE('${user.name}', '${user.username}', '${newVideo.platforms[0]}', '${newVideo.title}', '${newVideo.registeredAt}', '${newVideo.size}', '${newVideo.duration}', '${newVideo.resolution}');`, function(error, results, fields) {
            if (error) console.log(error);
            console.log('Saved to DB successfully');
        });

        console.log("*********************");
        console.log('Register video: Done.');
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
router.get('/thumbnail/:username/:registeredAt', function(req, res, next) {
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

// report url manually
router.post('/report', util.isLoggedin, function(req, res, next) {
    console.log("Report request from: " + req.body.username);
    console.log("Reported URL: " + req.body.url);
    console.log("Reported original video: " + req.body.registeredAt);

    var username = req.body.username;
    var url = req.body.url;
    var registeredAt = req.body.registeredAt;

    var result = {
        username: username,
        url: url,
        registeredAt: registeredAt
    };

    const spawn = require('child_process').spawn;
    const python = spawn('python', ["../c3-engine/run.py", "--username", username, "--url", url, "--registeredAt", registeredAt]);

    python.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    python.stderr.on('data', (data) => {
        console.log(data.toString());
    });
    python.on('close', (code) => {
        console.log("code:", code);
    });

    return res.json(util.successTrue(result));
});

// mark report as reported
router.get('/report/:username/:registeredAt', util.isLoggedin, function(req, res, next) {
    console.log("Marking report...");
    console.log("username: " + req.params.username + ", registeredAt: " + req.params.registeredAt);

    var username = req.params.username;
    var registeredAt = req.params.registeredAt;

    User.findOne({username:req.params.username})
    .select({reportList:1})
    .exec(function(err, user) {
        if (err || !user) return res.json(util.successFalse(err));

        for (var i = 0; i < user.reportList.length; ++i) {
            if (user.reportList[i].registeredAt == registeredAt && !user.reportList[i].reported) {
                var newReport = {
                    url: user.reportList[i].url,
                    registeredAt: user.reportList[i].registeredAt,
                    reported: true
                };

                user.reportList.splice(i, 1);
                user.reportList.push(newReport);
                //user.reportList[i].reported = true;
                break;
            }
        }

        user.save(function(err) {
            if (err) return res.json(util.successFalse(err));
            else {
                res.json(util.successTrue(user));
            }
        });
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
  User.findOne({email:req.params.email}, function(err,user){
    if(err||!user) return res.json(util.successFalse(err));
    else if(!req.decoded || user._id != req.decoded._id)
      return res.json(util.successFalse(null,'You don\'t have permission'));
    else next();
  });
}
