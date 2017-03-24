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

    var accountId, fileId, folderId, fileName, kloudlessImageURL, urlSet, messageId;

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

        function(callback) {

            const COMPUTER_VISION_KEY = '3936f08cea1f4a578988ef3cbf38cf0c';
            var query = {
                'visualFeatures': 'Tags,Description',
                'language': 'en'
            }
            console.log(qs.stringify(query));

            var requestOptions = {
                'uri': 'https://westus.api.cognitive.microsoft.com/vision/v1.0/analyze?' + qs.stringify(query),
                'method': 'POST',
                'headers': {
                    'Ocp-Apim-Subscription-Key': COMPUTER_VISION_KEY,
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
                console.log(JSON.stringify(body));

                var responseText = 'I think it is ';
                responseText += body.description.captions[0].text;
                responseText += '. The keywords are '
                for (var i = 0; i < body.tags.length; i++) {
                    var eachTag = body.tags[i];
                    responseText += eachTag.name + ', ';
                }
                console.log(responseText)
                callback(null, responseText);
            });
        },

        function(responseText, cb) {
            const REST_DB_API_KEY = '2dbd5be6c5a14f7a7afd555d0d1403c9b84ab';
            var requestOptions = {
                'uri': 'https://technica-7f86.restdb.io/rest/visionapi',
                'method': 'GET',
                'headers': {
                    'cache-control': 'no-cache',
                    'x-apikey': REST_DB_API_KEY,
                    'Content-Type': 'application/json'
                },
                json: true
            }

            request(requestOptions, function(error, response, body) {
                if (error) {
                    cb(error);
                    return;
                }
                // console.log(JSON.stringify(body));

                if (body.length == 0) {
                    cb(null, 'POST', responseText);
                } else {
                    messageId = body[0]._id;
                    cb(null, 'PUT', responseText);
                }
            });
        },

        function(method, responseText, cb) {

            var requestUrl = 'https://technica-7f86.restdb.io/rest/visionapi';
            if (method == 'PUT') {
                requestUrl += '/' + messageId;
            }
            const REST_DB_API_KEY = '2dbd5be6c5a14f7a7afd555d0d1403c9b84ab';
            var requestOptions = {
                'uri': requestUrl,
                'method': method,
                'headers': {
                    'cache-control': 'no-cache',
                    'x-apikey': REST_DB_API_KEY,
                    'Content-Type': 'application/json'
                },
                'body': {
                    "message": responseText
                },
                json: true
            }

            request(requestOptions, function(error, response, body) {
                if (error) {
                    cb(error);
                    return;
                }
                console.log(JSON.stringify(body));

                cb(null);
            });
        },

        function(callback) {

            const EMOTION_DETECTION_KEY = 'cbe628eec6a74cfea123c1e3c4e37769';

            var requestOptions = {
                'uri': 'https://westus.api.cognitive.microsoft.com/emotion/v1.0/recognize',
                'method': 'POST',
                'headers': {
                    'Ocp-Apim-Subscription-Key': EMOTION_DETECTION_KEY,
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
                console.log(JSON.stringify(body));

                // var responseText = 'I think it is ';
                // responseText += body.description.captions[0].text;
                // responseText += '. The keywords are '
                // for (var i = 0; i < body.tags.length; i++) {
                //     var eachTag = body.tags[i];
                //     responseText += eachTag.name + ', ';
                // }
                var responseText = 'The person is ';
                if (body.length == 0) {
                    responseText = 'No emotion detected'
                } else {

                    var scores = body[0].scores;
                    var emotion;
                    var max = 0;
                    for (var prop in scores) {
                        var eachScore = scores[prop]
                        if (max < eachScore) {
                            max = eachScore
                            emotion = prop
                        }
                    }
                    emotion = convertEmotion(emotion) ;
                    responseText += emotion

                }
                console.log(responseText)
                callback(null, responseText);
            });
        },

        function(responseText, cb) {
            const REST_DB_API_KEY = '2dbd5be6c5a14f7a7afd555d0d1403c9b84ab';
            var requestOptions = {
                'uri': 'https://technica-7f86.restdb.io/rest/emotionapi',
                'method': 'GET',
                'headers': {
                    'cache-control': 'no-cache',
                    'x-apikey': REST_DB_API_KEY,
                    'Content-Type': 'application/json'
                },
                json: true
            }

            request(requestOptions, function(error, response, body) {
                if (error) {
                    cb(error);
                    return;
                }
                // console.log(JSON.stringify(body));

                if (body.length == 0) {
                    cb(null, 'POST', responseText);
                } else {
                    messageId = body[0]._id;
                    cb(null, 'PUT', responseText);
                }
            });
        },

        function(method, responseText, cb) {

            var requestUrl = 'https://technica-7f86.restdb.io/rest/emotionapi';
            if (method == 'PUT') {
                requestUrl += '/' + messageId;
            }
            const REST_DB_API_KEY = '2dbd5be6c5a14f7a7afd555d0d1403c9b84ab';
            var requestOptions = {
                'uri': requestUrl,
                'method': method,
                'headers': {
                    'cache-control': 'no-cache',
                    'x-apikey': REST_DB_API_KEY,
                    'Content-Type': 'application/json'
                },
                'body': {
                    "message": responseText
                },
                json: true
            }

            request(requestOptions, function(error, response, body) {
                if (error) {
                    cb(error);
                    return;
                }
                console.log(JSON.stringify(body));

                cb(null);
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
function convertEmotion(emotion) {
    switch (emotion) {
        case "happiness" :
            return "happy"
       case "anger":  
        return "angry"
      case "contempt": 
        return "contemptful" ;
      case "disgust": 
        return "disgustful"
      case "fear": 
        return "scared"
      case "happiness": 
        return "happy"
      case "neutral":
        return "neutral"
      case "sadness": 
        return "sad"
      case "surprise" : 
        return  "surprised"

    }

       

}
module.exports = router;
