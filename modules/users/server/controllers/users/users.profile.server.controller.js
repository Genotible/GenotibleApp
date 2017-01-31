'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
    mongoose = require('mongoose'),
    multer = require('multer'),
    config = require(path.resolve('./config/config')),
    User = mongoose.model('User');

/**
 * Match
 */
exports.match = function(req, res) {

    var matchType = 0;


    // For security measurement we remove the roles from the req.body object
    // delete req.body.roles;

    // console.log("match req body : " + req.body.yourGenotype);

    //  check if requester has added data
    User.findOne({
        email: req.body.yourEmail
    }).exec(function(err, requester) {
        if (err) {
            res.status(701).send({
                message: 'Error finding user (Requester) with email : ' + req.body.yourEmail
            });
        } else if (!requester) {
            res.status(700).send({
                message: 'No user (Requester) with that email has been found : ' + req.body.yourEmail
            });
        } else {

            if (requester.isVerified) {
                // fetch spouse data and run a match
                User.findOne({
                    email: req.body.spouseEmail
                }).exec(function(err, user) {
                    if (err) {
                        res.status(601).send({
                            message: 'Error finding user with email : ' + req.body.spouseEmail
                        });
                    } else if (!user) {
                        res.status(600).send({
                            message: 'No user with that email has been found : ' + req.body.spouseEmail
                        });
                    } else {
                        // Not doing verification check cos we want to be able to use unverified data for genotibility check for now.

                        // var genotype = getGenotypeValue(req.body.yourGenotype);
                        // var spouseGenotype = getGenotypeValue(user.genotype);
                        // req.profile = user;
                        if (user.genotype === "AA" || requester.genotype === "AA") {
                            matchType += 1;
                        }

                        if (user.religion === requester.religion) {
                            matchType += 2;
                        }

                        // if ((user.religion === req.body.yourReligion) && (user.genotype === req.body.yourGenotype)) {
                        //   matchType = 3;
                        // }

                        console.log("user is : " + user);

                        requester.incrementPerformedChecks();

                        user.incrementRequestedChecks();


                        requester.save(function(err) {
                            if (err) {
                                console.log("Failed to update count for requester : " + requester.email);
                            } else {
                                console.log("updated count for requester : " + requester.performedChecks);
                            }
                        });

                        user.save(function(err) {
                            if (err) {
                                console.log("Failed to update count for requested user : " + user.email);
                            } else {
                                console.log("updated count for requested user : " + user.requestedChecks);
                            }
                        });



                        res.json(matchType);
                        // next();
                    }
                });
            } else {
                res.status(800).send({
                    message: 'Requester\'s data needs verification!.'
                });
            }

        }


    });

    // Init Variables
    // var user = new User(req.body);
    // var message = null;

    // // Add missing user fields
    // user.provider = 'local';
    // user.displayName = user.firstName + ' ' + user.lastName;

    // // Then save the user
    // user.save(function (err) {
    //   if (err) {
    //     return res.status(400).send({
    //       message: errorHandler.getErrorMessage(err)
    //     });
    //   } else {
    //     // Remove sensitive data before login
    //     user.password = undefined;
    //     user.salt = undefined;

    //     req.login(user, function (err) {
    //       if (err) {
    //         res.status(400).send(err);
    //       } else {
    //         res.json(user);
    //       }
    //     });
    //   }
    // });
};


/**
 * Update user details
 */
exports.update = function(req, res) {
    // Init Variables
    var user = req.user;

    // For security measurement we remove the roles from the req.body object
    delete req.body.roles;

    if (user) {
        // Merge existing user
        user = _.extend(user, req.body);
        user.updated = Date.now();
        user.displayName = user.firstName + ' ' + user.lastName;

        user.save(function(err) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getErrorMessage(err)
                });
            } else {
                req.login(user, function(err) {
                    if (err) {
                        res.status(400).send(err);
                    } else {
                        res.json(user);
                    }
                });
            }
        });
    } else {
        res.status(400).send({
            message: 'User is not signed in'
        });
    }
};

/**
 * Update profile picture
 */
exports.changeProfilePicture = function(req, res) {
    var user = req.user;
    var message = null;
    var upload = multer(config.uploads.profileUpload).single('newProfilePicture');
    var profileUploadFileFilter = require(path.resolve('./config/lib/multer')).profileUploadFileFilter;

    // Filtering to upload only images
    upload.fileFilter = profileUploadFileFilter;

    if (user) {
        upload(req, res, function(uploadError) {
            if (uploadError) {
                return res.status(400).send({
                    message: 'Error occurred while uploading profile picture'
                });
            } else {
                user.profileImageURL = config.uploads.profileUpload.dest + req.file.filename;

                user.save(function(saveError) {
                    if (saveError) {
                        return res.status(400).send({
                            message: errorHandler.getErrorMessage(saveError)
                        });
                    } else {
                        req.login(user, function(err) {
                            if (err) {
                                res.status(400).send(err);
                            } else {
                                res.json(user);
                            }
                        });
                    }
                });
            }
        });
    } else {
        res.status(400).send({
            message: 'User is not signed in'
        });
    }
};

/**
 * Send User
 */
exports.me = function(req, res) {
    res.json(req.user || null);
};


/**
 * Send All Users
 */
exports.getRecordCounts = function(req, res) {
    User.find({}, function(err, users) {
        
        if (!err) {
            var recordMap = {};
            recordMap.added = users.length;
            var verifyCount = 0;
            var checksCount = 0;

            users.forEach(function(user) {
                if(user.isVerified){
                    verifyCount += 1;
                }
                checksCount += user.performedChecks;
            });

            recordMap.verified = verifyCount;
            recordMap.checked = checksCount;

            res.send(recordMap);
        } else {
            res.status(400).send({
            message: 'Error running record counts, err : ' + err
        });
        }

    });
};
