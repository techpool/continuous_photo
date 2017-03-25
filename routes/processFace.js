var express = require('express');
var router = express.Router();
var async = require('async');
var cheerio = require('cheerio');
var qs = require('querystring');
var request = require('request');

var kloudless = require('kloudless')('KgH5wcL5WwIZT_Vush15K_AOnOfX17o_Q64eDCvdBCJ6cL3l');
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {


    var groupName = req.query.groupName;
    var faceName = req.query.faceName;
    var accountId, fileId, folderId, fileName, kloudlessImageURL, urlSet, messageId, personGroupId;

    async.waterfall([
        function(cb) {
            // to get the base account data
            kloudless.accounts.base({}, function(err, res) {
                if (err) {
                    return console.log("Error getting the account data: " + err);
                }
                // assuming you authorized at least one service (Dropbox, Google Drive, etc.)
                console.log("We got the account data!");
                accountId = res["objects"][0]["id"];
                cb();
            });
        },

        function(cb) {
            // and now we're going to download that file we just uploaded
            kloudless.folders.contents({
                "account_id": accountId,
                "folder_id": 'root'
            }, function(err, folders) {
                if (err) {
                    return console.log("Files contents: " + err);
                }
                console.log("got the folders:");
                // console.log(folders)

                for (var i = 0; i < folders.objects.length; i++) {
                    var eachFolder = folders.objects[i];
                    if (eachFolder.name == 'Technika') {
                        folderId = eachFolder.id;
                    }
                }
                cb();
            });
        },

        function(cb) {
            // and now we're going to download that file we just uploaded
            kloudless.folders.contents({
                "account_id": accountId,
                "folder_id": folderId
            }, function(err, folders) {
                if (err) {
                    return console.log("Files contents: " + err);
                }
                console.log("got the folders:");
                console.log(folders)

                fileId = folders.objects[0].id;
                fileName = folders.objects[0].name;
                cb();
            });
        },

        function(cb) {
            // and now we're going to download that file we just uploaded
            kloudless.links.create({
                "account_id": accountId,
                "file_id": fileId
            }, function(err, fileDetails) {
                if (err) {
                    return console.log("Files contents: " + err);
                }
                kloudlessImageURL = fileDetails.url;
                console.log(kloudlessImageURL)
                cb();
            });
        },
        function(cb) {
            // and now we're going to download that file we just uploaded
            request.get(kloudlessImageURL, function(error, response, body) {
                console.log(body)
                var $ = cheerio.load(body);
                urlSet = $('meta[property="og:image"]').attr('content')

                console.log('-----------------')
                console.log(urlSet)
                console.log('-----------------')

                cb();
            });
        },

        function(cb) {

            if (urlSet.constructor === Array) {
                for (var i = 0; i < urlSet.length; i++) {
                    var eachurlSet = urlSet[i];
                    if (eachurlSet) {
                        urlSet = eachurlSet
                        cb()
                        break;
                    }
                }
            } else {
                cb()
            }
        },

        /**
         * Checks if a person group exists
         * @param  {Function} callback Callback function to async
         */
        function(callback) {

            const COMPUTER_FACE_API_KEY = '4e354449b23647b6921fe8afbe2c51bc';

            var requestOptions = {
                'uri': 'https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/' + groupName,
                'method': 'GET',
                'headers': {
                    'Ocp-Apim-Subscription-Key': COMPUTER_FACE_API_KEY,
                    'Content-Type': 'application/json'
                }
            }

            request(requestOptions, function(error, response, body) {

                console.log(response)
                if (response.statusCode == 404) {
                    callback(null, true);
                    return;
                } else {
                    personGroupId = groupName;
                    callback(null, false);
                }
            });
        },

        /**
         * Creates a person group exists
         * @param  {Function} callback Callback function to async
         * @param  {Boolean}  whetherCreateAGroup checks if the group needs to be created
         */
        function(whetherCreateAGroup, callback) {

            console.log('--------')
            console.log(whetherCreateAGroup)
            console.log('--------')


            if (!whetherCreateAGroup) {
                callback(null);
                return;
            }

            const COMPUTER_FACE_API_KEY = '4e354449b23647b6921fe8afbe2c51bc';

            var requestOptions = {
                'uri': 'https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/' + groupName,
                'method': 'PUT',
                'headers': {
                    'Ocp-Apim-Subscription-Key': COMPUTER_FACE_API_KEY,
                    'Content-Type': 'application/json'
                },
                'json': {
                    "name": groupName
                }
            }

            request(requestOptions, function(error, response, body) {

                if (error) {
                    callback(error);
                    return;
                }

                console.log('--------')
                console.log(body)
                console.log('--------')

                personGroupId = groupName;
                callback()
            });
        },

        /**
         * Creates a person group exists
         * @param  {Function} callback Callback function to async
         * @param  {Boolean}  whetherCreateAGroup checks if the group needs to be created
         */
        function(callback) {


            const COMPUTER_FACE_API_KEY = '4e354449b23647b6921fe8afbe2c51bc';
            var requestOptions = {
                'uri': 'https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/' + personGroupId + '/persons',
                'method': 'POST',
                'headers': {
                    'Ocp-Apim-Subscription-Key': COMPUTER_FACE_API_KEY,
                    'Content-Type': 'application/json'
                },
                'json': {
                    "name": faceName
                }
            }

            request(requestOptions, function(error, response, body) {

                if (error) {
                    callback(error);
                    return;
                }
                personId = body.personId;
                console.log('----------------')
                console.log(body)
                console.log('----------------')
                callback(null, personId);
            });
        },

        function(personId, callback) {


            const COMPUTER_FACE_API_KEY = '4e354449b23647b6921fe8afbe2c51bc';
            var requestOptions = {
                'uri': 'https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/' + personGroupId + '/persons/' + personId + '/persistedFaces',
                'method': 'POST',
                'headers': {
                    'Ocp-Apim-Subscription-Key': COMPUTER_FACE_API_KEY,
                    'Content-Type': 'application/json'
                },
                'json': {
                    "url": urlSet
                }
            }

            request(requestOptions, function(error, response, body) {

                if (error) {
                    callback(error);
                    return;
                }

                console.log('----------------')
                console.log(body)
                console.log('----------------')
                // var personId = body.personId;
                callback(null);
            });
        },

        // function(callback) {
        //     var requestUrl = 'https://technica-7f86.restdb.io/rest/persons';

        //     const REST_DB_API_KEY = '2dbd5be6c5a14f7a7afd555d0d1403c9b84ab';
        //     var requestOptions = {
        //         'uri': requestUrl,
        //         'method': 'POST',
        //         'headers': {
        //             'cache-control': 'no-cache',
        //             'x-apikey': REST_DB_API_KEY,
        //             'Content-Type': 'application/json'
        //         },
        //         'body': {
        //             "personId": personId,
        //             "name": faceName
        //         },
        //         json: true
        //     }

        //     request(requestOptions, function(error, response, body) {
        //         if (error) {
        //             callback(error);
        //             return;
        //         }

        //         callback(null);
        //     });
        // },

        function(callback) {


            const COMPUTER_FACE_API_KEY = '4e354449b23647b6921fe8afbe2c51bc';
            var requestOptions = {
                'uri': 'https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/' + personGroupId + '/train',
                'method': 'POST',
                'headers': {
                    'Ocp-Apim-Subscription-Key': COMPUTER_FACE_API_KEY,
                    'Content-Type': 'application/json'
                }
            }

            request(requestOptions, function(error, response, body) {

                if (error) {
                    callback(error);
                    return;
                }
                // var personId = body.personId;
                callback(null);
            });
        }

    ], function(error, responseText) {
        if (error) {
            res.send(error);
        } else {
            res.send(responseText);
        }
    });
});

module.exports = router;
