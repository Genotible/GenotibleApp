'use strict';
angular.module('core').controller('HomeController', ['$scope', 'Authentication', '$state', '$http', '$location', '$window', 'PasswordValidator',
    function($scope, Authentication, $state, $http, $location, $window, PasswordValidator) {
        $scope.myModel = {
            Url: 'http://www.genotible.com',
            Name: "A platform that\'s creating a world void of sickle cell anaemia disease, step by step, one genotibility check at a time.",
            ImageUrl: 'modules/core/client/img/brand/couples.png'
        };

        $scope.authentication = Authentication;

        $scope.radioModel = 'Middle';

        $scope.isLoading = false;
        $scope.isMatching = false;

        $scope.religions = ["African Tradition", "Atheist", "Budihism", "Christainity", "Hinduism", "Islam", "Judaism", "Other"];
        $scope.genotypes = ["AA", "AS", "AC", "SS", "SC", "I don't know yet"];
        $scope.matchData = {};
        $scope.feedbackData = {};
        $scope.credentials = {};
        $scope.error = {};

        $scope.matchData.yourReligion = $scope.authentication.user ? $scope.authentication.user.religion : $scope.religions[0];
        $scope.credentials.religion = $scope.religions[0];

        $scope.matchData.yourGenotype = $scope.authentication.user ? $scope.authentication.user.genotype : $scope.genotypes[0];
        $scope.credentials.genotype = $scope.genotypes[0];

        if ($scope.authentication.user) {
            $scope.matchData.yourEmail = $scope.authentication.user.email;
        }

        $scope.requesterId = $state.params.requesterId;
        console.log("previous state params : " + $scope.requesterId);
        console.log("previous state params : " + $scope.type);
        console.log("previous state params : " + $scope.id);

        $scope.records = {};


        $scope.verify = function() {

            if ($state.params.type === "verify" && $state.params.id !== null) {

                var data = {
                    'id': $state.params.id
                };
                // $scope.type = null;
                // $scope.id = null;

                $http.post('/api/auth/verify', data).success(function(response) {
                    var msg = "Your data was verified successfully!, you can now perfrom Genotibility check.";
                    $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                        'type': 'information',
                        'title': 'Information'
                    });
                    $location.path('/');
                }).error(function(response) {
                    var msg = "Data verification failed, please try again";
                    $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                        'type': 'error',
                        'title': 'Error'
                    });
                });

            }
        };


        $scope.updateRecords = function() {
            $http.get('/api/records').success(function(response) {
                console.log("fetched records : " + response.verified);
                $scope.records = response;
            }).error(function(response) {
                console.log(response.message);
            });
        };
        $scope.signup = function(isValid) {
            $scope.error = {};

            if (!isValid) {
                $scope.$broadcast('show-errors-check-validity', 'userForm');
                return false;
            }

            $scope.isLoading = true;
            $http.post('/api/auth/signup', $scope.credentials).success(function(response) {
                // If successful we assign the response to the global user model
                $scope.authentication.user = response;

                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.isLoading = false;
                    });
                }, 2000);

                setTimeout(function() {
                    var msg = "Your data was recorded successfully!. Please check your email for verification Link.";
                    $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                        'type': 'information',
                        'title': 'Information'
                    });
                    if ($scope.requesterId) {
                        $scope.notify({
                            'id': $scope.requesterId
                        });
                    }
                    // And redirect to the previous or home page
                    $state.go($state.previous.state.name || 'home', $state.previous.params);
                }, 2100);

                $scope.credentials = {};
                $scope.updateRecords();

            }).error(function(response) {
                $scope.error.dataForm = response.message;
                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.isLoading = false;
                    });
                }, 2000);
                setTimeout(function() {
                    var msg = "Oops! something went wrong!, Please confirm you entered a valid data.";
                    $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                        'type': 'error',
                        'title': 'Error'
                    });
                }, 2100);

            });
        };

        $scope.notify = function(data) {
            console.log("sending notify email ......");
            $http.post('/api/notify', data).success(function(response) {
                // Show user success message and clear form
                $scope.inviteData = null;
                $scope.success = response.message;

                console.log("passed : " + response.message);
            }).error(function(response) {
                // Show user error message and clear form
                $scope.credentials = null;
                // $scope.error = response.message;
                console.log("failed : " + response.message);
            });
        };

        $scope.sendFeedback = function(isValid) {
            if (!isValid) {
                $scope.$broadcast('show-errors-check-validity', 'feedbackForm');

                return false;
            }
            $scope.isLoading = true;

            console.log("feedbackData email : " + $scope.feedbackData.yourEmail);
            console.log("feedbackData message : " + $scope.feedbackData.message);

            $http.post('/api/feedback/send', $scope.feedbackData).success(function(response) {
                // If successful we assign the response to the global user model
                // $scope.authentication.user = response;

                // And redirect to the previous or home page
                // $scope.matchData = response;
                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.isLoading = false;
                    });
                }, 2000);

                setTimeout(function() {
                    console.log("response is : " + response);
                    var msg = "Thanks for the feedback, it was sent successfully.";
                    $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                        'type': 'information',
                        'title': 'Information'
                    });
                }, 2100);

                $scope.feedbackData = {};

            }).error(function(response, status) {
                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.isLoading = false;
                    });
                }, 2000);

                setTimeout(function() {
                    var msg = "Error sending feedback.";
                    $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                        'type': 'error',
                        'title': 'Error'
                    });
                }, 2100);
                if (response) {
                    console.log("Error message : " + response.message);
                }

            });
        };

        $scope.runMatch = function(isValid) {

            console.log("called runMatch");
            console.log(" runMatch is valid : " + isValid);
            $scope.error = {};

            if (!isValid) {
                $scope.$broadcast('show-errors-check-validity', 'matchForm');

                return false;
            }
            $scope.isMatching = true;

            $http.post('/api/match', $scope.matchData).success(function(response) {
                // If successful we assign the response to the global user model
                // $scope.authentication.user = response;

                // And redirect to the previous or home page
                // $scope.matchData = response;
                console.log("response is : " + response);

                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.isMatching = false;
                    });
                }, 2000);

                setTimeout(function() {

                    switch (response) {
                        case 1:
                            $.Zebra_Dialog("You are genotible, But of different faith! \n" + "The decision is yours ...");

                            break;
                        case 2:
                            $.Zebra_Dialog("You are not genotible! \n " + " We advice you to move on");
                            break;
                        case 3:
                            $.Zebra_Dialog("You are genotible! \n" + "We advice you to make a move...");
                            break;
                        default:
                            var msg = "Error processing match, please check the data provided.";
                            $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                                'type': 'error',
                                'title': 'Error'
                            });
                            break;
                    }
                }, 2100);

                $scope.matchData = {};
                $scope.updateRecords();


                // $state.go($state.previous.state.name || 'home', $state.previous.params);
                // $scope.open();
            }).error(function(response, status) {
                if (response) {
                    console.log("Error message : " + response.message);
                    console.log("Error status : " + status);
                    if (status === 600) {
                        console.log("send email");
                        $scope.sendInvite({
                            'email': $scope.matchData.spouseEmail,
                            'requesterEmail': $scope.matchData.yourEmail
                        });
                        $scope.matchData = {};
                    } else if (status === 700) {
                        setTimeout(function() {
                            $scope.$apply(function() {
                                $scope.isMatching = false;
                            });
                        }, 2000);

                        setTimeout(function() {
                            var msg = "Please add info for `" + $scope.matchData.yourEmail + "` in the `Add Data section` before performing a genotible match.";
                            $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                                'type': 'information',
                                'title': 'Information'
                            });
                        }, 2100);

                    } else if (status === 800) {
                        setTimeout(function() {
                            $scope.$apply(function() {
                                $scope.isMatching = false;
                            });
                        }, 2000);

                        setTimeout(function() {
                            var msg = "Please you need to verify your data, before doing genotibility check. Check your email `" + $scope.matchData.yourEmail + "` for genotible verification mail.";
                            $.Zebra_Dialog('<strong>' + msg + '</strong>', {
                                'type': 'information',
                                'title': 'Information'
                            });
                        }, 2100);

                    } else {
                        setTimeout(function() {
                            $scope.$apply(function() {
                                $scope.isMatching = false;
                            });
                        }, 2000);

                        setTimeout(function() {
                            $.Zebra_Dialog('<strong>Oops! Data loading error, please try again.</strong>', {
                                'type': 'error',
                                'title': 'Error'
                            });
                        }, 2100);
                    }
                } else {
                    $scope.error.checkForm = response.message;
                    setTimeout(function() {
                        $scope.$apply(function() {
                            $scope.isMatching = false;
                        });
                    }, 2000);

                    setTimeout(function() {
                        $.Zebra_Dialog('<strong>Error processing match, please check the data provided.</strong>', {
                            'type': 'error',
                            'title': 'Error'
                        });
                    }, 2100);
                }
            });
        };

        $scope.sendInvite = function(data) {
            console.log("sending email ......");
            $http.post('/api/invite', data).success(function(response) {
                // Show user success message and clear form
                $scope.inviteData = null;
                $scope.success = response.message;
                setTimeout(function() {
                    $scope.$apply(function() {
                        $scope.isMatching = false;
                    });
                }, 2000);

                setTimeout(function() {
                    $.Zebra_Dialog('<strong>' + response.message + '</strong>', {
                        'type': 'information',
                        'title': 'Information'
                    });
                }, 2100);
            }).error(function(response) {
                // Show user error message and clear form
                $scope.credentials = null;
                $scope.error = response.message;
                $scope.isMatching = false;
                $.Zebra_Dialog('<strong>' + response.message + '</strong>', {
                    'type': 'error',
                    'title': 'Error'
                });
            });
        };

        $scope.updateRecords();

        $scope.$apply(function() {
            $scope.verify();
        });

    }
]);
