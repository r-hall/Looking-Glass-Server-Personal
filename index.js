const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const Users = require('./db.js').Users;
const getTweets = require('./tweets.js');
const scrapeReplies = require('./config/awsURLs.js');
const port = process.env.PORT || 3001;

// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');

// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var app = express();

// Logging and parsing
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.get('/health', (req, res) => {
  res.writeHead(200);
  res.end('healthy');
})

app.get('/tweets/:userId/:viewerId', async (req, res) => {
    try {
      let userId = req.params.userId;
      let viewerId = req.params.viewerId;
      let viewer = await Users.findOne({id: viewerId})
      let tokenKey = viewer.twitterTokenKey;
      let tokenSecret = viewer.twitterTokenSecret;
      let client = new Twitter({
        consumer_key: authAPI.TWITTER_CONSUMER_KEY,
        consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
        access_token_key: tokenKey,
        access_token_secret: tokenSecret
      });
      let tweets = await getTweets(client, userId);
      let numTweets = tweets.length;
      let batchSize = 20;
      let batches = Math.ceil(numTweets / batchSize);
      for (let i = 0; i < batches; i++) {
        let messageArr = [];
        let numberBatchTweets = Math.min(batchSize * (i + 1) - batchSize * i, tweets.length - batchSize * i);
        for (let j = 0; j < numberBatchTweets; j++) {
          messageArr.push(`${tweets[batchSize * i + j]['user']['id_str']}.${tweets[batchSize * i + j]['id_str']}`)
        }
        let message = messageArr.join(',');
        let params = {
          DelaySeconds: 10,
          MessageBody: message,
          QueueUrl: scrapeReplies
         };
         sqs.sendMessage(params, function(err, data) {
           if (err) {
             console.log("Error in scrape-replies", err);
           } else {
             console.log("Success in scrape-replies", data.MessageId);
           }
         });
      }
      res.writeHead(200);
      res.end(JSON.stringify(tweets));
    } catch(err) {
      console.log('error in /tweets/:userId/:viewerId', err);
      res.writeHead(404);
      res.end(err);
    }
})

app.listen(port, () => {
	console.log(`listening on port ${port}`);
})
