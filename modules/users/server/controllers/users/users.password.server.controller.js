'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    config = require(path.resolve('./config/config')),
    errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    nodemailer = require('nodemailer'),
    async = require('async'),
    crypto = require('crypto');

// // ssl://smtp.gmail.com 
//   var smtpConfig = {
//     host: 'smtp.googlemail.com',
//     port: 465,
//     secure: true, // use SSL
//     auth: {
//         user: 'kehesjay@gmail.com',
//         pass: '1000200030004000Pword'
//     }
// };

// var smtpTransport = nodemailer.createTransport(smtpConfig);

// var smtpTransport = nodemailer.createTransport(config.mailer.options);

// var smtpTransport = nodemailer.createTransport("SMTP",{
//     host: 'smtp.1blu.de',
//     secureConnection: true,
//     port: 465,
//     auth: {
//        user: '...',
//        pass: '...'
//     },
//     tls:{
//         secureProtocol: "TLSv1_method"
//     }
// });

var smtpTransport = nodemailer.createTransport({
    service: 'Mailgun',
    auth: {
        user: 'postmaster@mg.genotible.com', // postmaster@sandbox[base64 string].mailgain.org
        pass: '4f64092967a7a70fca66b5dfbd249abf' // You set this.
    }
});


/**
 * Signup
 */
exports.signup = function(req, res, next) {


    async.waterfall([

        function(done) {
            // For security measurement we remove the roles from the req.body object
            delete req.body.roles;
            delete req.body.isVerified;

            // Init Variables
            var user = new User(req.body);
            var message = null;

            // Add missing user fields
            user.provider = 'local';
            user.displayName = user.firstName + ' ' + user.lastName;

            // Then save the user
            user.save(function(err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    // Remove sensitive data before login
                    user.password = undefined;
                    user.salt = undefined;


                    res.render(path.resolve('modules/users/server/templates/genotible-verify-email'), {
                        appName: config.app.title,
                        url: 'https://genotible.herokuapp.com/verify/' + user._id
                    }, function(err, emailHTML) {
                        console.log("email html  : " + emailHTML);
                        console.log("error : " + err);

                        done(err, emailHTML, user);

                    });
                }
            });
        },
        // If valid email, send reset email using service
        function(emailHTML, user, done) {
            // send data verification email.
            var mail;
            mail = {
                from: 'data@genotible.com',
                to: user.email, // comma separated list
                subject: 'Genotible data verification',
                html: emailHTML
            };

            smtpTransport.sendMail(mail, function(error, info) {
                if (error) {
                    console.log("error sending verification mail : " + error);
                    res.status(400).send({
                        message: error.message
                    });
                } else {
                    console.log('verification message Sent: ' + info.response);
                    res.json(user);
                }
                done(error);
            });

        }
    ], function(err) {
        if (err) {
            return next(err);
        }
    });



    // req.login(user, function (err) {
    //   if (err) {
    //     console.log("error is : " + err);
    //     res.status(400).send(err);
    //   } else {

    //   }
    // });
};

exports.verify = function(req, res, next) {

    User.findOne({
        _id: req.body.id
    }).exec(function(err, user) {
        if (err) {
            // error getting user
            console.log("error getting user : " + err);
            res.status(400).send({
                message: err.message
            });
        } else if (!user) {
            // error getting user
            console.log("user not found  user_id is : " + req.body.id);
        } else {
            user.updated = Date.now();
            user.isVerified = true;
            user.save(function(err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(user);
                }
            });
        }
    });

};



exports.sendFeedback = function(req, res, next) {

    var mail;

    mail = {
        from: req.body.yourEmail,
        to: 'data@genotible.com', // comma separated list
        subject: 'Genotible Feedback',
        text: req.body.message,
        html: '<p>' + req.body.message + '</p>'
    };

    smtpTransport.sendMail(mail, function(error, info) {
        if (error) {
            console.log("error sending Feedback mail : " + error);
            res.status(400).send({
                message: error.message
            });
        } else {
            console.log('Feedback message Sent: ' + info.response);
            res.send({
                message: 'Feedback sent successfully.'
            });
        }
    });
};


// console.log('SMTP Configured');

var getRequesterId = function(email) {
    var userId = null;
    User.findOne({
        email: email
    }).exec(function(err, user) {
        if (err) {
            // error getting user
            console.log("error getting user : " + err);
        } else if (!user) {
            // error getting user
            console.log("user not found  : " + email);
        } else {
            userId = user._id;
            console.log("user id : " + userId);
        }
    });
    return userId;
};


/**
 * Notify email (invite POST)
 */
exports.notify = function(req, res, next) {
    // sendMail(req.body.email);
    async.waterfall([

        function(done) {
            var httpTransport = 'http://';
            if (config.secure && config.secure.ssl === true) {
                httpTransport = 'https://';
            }

            User.findOne({
                _id: req.body.id
            }).exec(function(err, user) {
                if (err) {
                    // error getting user
                    console.log("error getting user : " + err);
                } else if (!user) {
                    // error getting user
                    console.log("user not found  : " + req.body.id);
                } else {
                    // userId = user._id;
                    // console.log("user id : " + userId);

                    req.body.email = user.email;

                    res.render(path.resolve('modules/users/server/templates/genotible-notify-email'), {
                        appName: config.app.title,
                        firstName: user.firstName,
                        url: 'https://genotible.herokuapp.com/'
                    }, function(err, emailHTML) {
                        console.log("email html  : " + emailHTML);
                        console.log("error : " + err);
                        done(err, emailHTML);
                    });
                }
            });
        },
        // If valid email, send reset email using service
        function(emailHTML, done) {
            var mailOptions = {
                to: req.body.email,
                from: 'data@genotible.com',
                subject: 'Genotibility Check',
                html: emailHTML
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                if (!err) {
                    res.send({
                        message: "Notification sent successfully"
                    });
                } else {
                    console.log("error : " + err);
                    console.log("error message : " + err.message);
                    return res.status(400).send({
                        message: "Notification Failed"
                    });
                }

                done(err);
            });
        }
    ], function(err) {
        if (err) {
            return next(err);
        }
    });
};


/**
 * Invite email (invite POST)
 */
exports.invite = function(req, res, next) {
    // sendMail(req.body.email);
    async.waterfall([

        function(done) {
            var httpTransport = 'http://';
            if (config.secure && config.secure.ssl === true) {
                httpTransport = 'https://';
            }

            User.findOne({
                email: req.body.requesterEmail
            }).exec(function(err, user) {
                if (err) {
                    // error getting user
                    console.log("error getting user : " + err);
                } else if (!user) {
                    // error getting user
                    console.log("user (requester) not found  with email : " + req.body.requesterEmail);
                } else {
                    // userId = user._id;
                    // console.log("user id : " + userId);

                    res.render(path.resolve('modules/users/server/templates/genotible-invite-email'), {
                        appName: config.app.title,
                        url: 'https://genotible.herokuapp.com/' + user._id
                    }, function(err, emailHTML) {
                        console.log("email html  : " + emailHTML);
                        console.log("error : " + err);
                        done(err, emailHTML);
                    });
                }
            });
        },
        // If valid email, send reset email using service
        function(emailHTML, done) {
            var mailOptions = {
                to: req.body.email,
                from: 'data@genotible.com',
                subject: 'Genotibility Check',
                html: emailHTML
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                if (!err) {
                    res.send({
                        message: "Oops! Bae's data is not available. \n An email has been sent to the provided email address with further instructions on how to add data. \n You will be notified when bae adds data."
                    });
                } else {
                    console.log("error : " + err);
                    console.log("error message : " + err.message);
                    return res.status(400).send({
                        message: "Oops! Bae's data is not available. \n We're unable to send invite email to the provided email address.\n please confirm it's valid and try again."
                    });
                }

                done(err);
            });
        }
    ], function(err) {
        if (err) {
            return next(err);
        }
    });
};

/**
 * Forgot for reset password (forgot POST)
 */
exports.forgot = function(req, res, next) {
    async.waterfall([
        // Generate random token
        function(done) {
            crypto.randomBytes(20, function(err, buffer) {
                var token = buffer.toString('hex');
                done(err, token);
            });
        },
        // Lookup user by username
        function(token, done) {
            if (req.body.username) {
                User.findOne({
                    username: req.body.username.toLowerCase()
                }, '-salt -password', function(err, user) {
                    if (!user) {
                        return res.status(400).send({
                            message: 'No account with that username has been found'
                        });
                    } else if (user.provider !== 'local') {
                        return res.status(400).send({
                            message: 'It seems like you signed up using your ' + user.provider + ' account'
                        });
                    } else {
                        user.resetPasswordToken = token;
                        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                        user.save(function(err) {
                            done(err, token, user);
                        });
                    }
                });
            } else {
                return res.status(400).send({
                    message: 'Username field must not be blank'
                });
            }
        },
        function(token, user, done) {

            var httpTransport = 'http://';
            if (config.secure && config.secure.ssl === true) {
                httpTransport = 'https://';
            }
            res.render(path.resolve('modules/users/server/templates/reset-password-email'), {
                name: user.displayName,
                appName: config.app.title,
                url: httpTransport + req.headers.host + '/api/auth/reset/' + token
            }, function(err, emailHTML) {
                done(err, emailHTML, user);
            });
        },
        // If valid email, send reset email using service
        function(emailHTML, user, done) {
            var mailOptions = {
                to: user.email,
                from: config.mailer.from,
                subject: 'Password Reset',
                html: emailHTML
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                if (!err) {
                    res.send({
                        message: 'An email has been sent to the provided email with further instructions.'
                    });
                } else {
                    return res.status(400).send({
                        message: 'Failure sending email'
                    });
                }
                done(err);
            });
        }
    ], function(err) {
        if (err) {
            return next(err);
        }
    });
};

/**
 * Reset password GET from email token
 */
exports.validateResetToken = function(req, res) {
    User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {
            $gt: Date.now()
        }
    }, function(err, user) {
        if (!user) {
            return res.redirect('/password/reset/invalid');
        }

        res.redirect('/password/reset/' + req.params.token);
    });
};

/**
 * Reset password POST from email token
 */
exports.reset = function(req, res, next) {
    // Init Variables
    var passwordDetails = req.body;
    var message = null;

    async.waterfall([

        function(done) {
            User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordExpires: {
                    $gt: Date.now()
                }
            }, function(err, user) {
                if (!err && user) {
                    if (passwordDetails.newPassword === passwordDetails.verifyPassword) {
                        user.password = passwordDetails.newPassword;
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

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
                                        // Remove sensitive data before return authenticated user
                                        user.password = undefined;
                                        user.salt = undefined;

                                        res.json(user);

                                        done(err, user);
                                    }
                                });
                            }
                        });
                    } else {
                        return res.status(400).send({
                            message: 'Passwords do not match'
                        });
                    }
                } else {
                    return res.status(400).send({
                        message: 'Password reset token is invalid or has expired.'
                    });
                }
            });
        },
        function(user, done) {
            res.render('modules/users/server/templates/reset-password-confirm-email', {
                name: user.displayName,
                appName: config.app.title
            }, function(err, emailHTML) {
                done(err, emailHTML, user);
            });
        },
        // If valid email, send reset email using service
        function(emailHTML, user, done) {
            var mailOptions = {
                to: user.email,
                from: config.mailer.from,
                subject: 'Your password has been changed',
                html: emailHTML
            };

            smtpTransport.sendMail(mailOptions, function(err) {
                done(err, 'done');
            });
        }
    ], function(err) {
        if (err) {
            return next(err);
        }
    });
};

/**
 * Change Password
 */
exports.changePassword = function(req, res, next) {
    // Init Variables
    var passwordDetails = req.body;
    var message = null;

    if (req.user) {
        if (passwordDetails.newPassword) {
            User.findById(req.user.id, function(err, user) {
                if (!err && user) {
                    if (user.authenticate(passwordDetails.currentPassword)) {
                        if (passwordDetails.newPassword === passwordDetails.verifyPassword) {
                            user.password = passwordDetails.newPassword;

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
                                            res.send({
                                                message: 'Password changed successfully'
                                            });
                                        }
                                    });
                                }
                            });
                        } else {
                            res.status(400).send({
                                message: 'Passwords do not match'
                            });
                        }
                    } else {
                        res.status(400).send({
                            message: 'Current password is incorrect'
                        });
                    }
                } else {
                    res.status(400).send({
                        message: 'User is not found'
                    });
                }
            });
        } else {
            res.status(400).send({
                message: 'Please provide a new password'
            });
        }
    } else {
        res.status(400).send({
            message: 'User is not signed in'
        });
    }
};
