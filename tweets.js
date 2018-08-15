
let twitterFetchTweets = (client, endpoint, params, results) => {
	return new Promise( async (resolve, reject) => {
		try {
			let response = await client.get(endpoint, params);
			resolve(response);
	      } catch(error) {
		    console.log('error in twitterFetchTweets', error)
		    reject(error);
		  }
		
	})
}

let getTweets = (client, userId, followers) => {
	return new Promise( async (resolve, reject) => {
		try {
			let tweetsEndpoint = 'statuses/user_timeline'; 
			let tweetsParams = {
				'user_id': userId,
				'count': 200,
				'tweet_mode': 'extended',
				'exclude_replies': true
			};
			let tweets = await twitterFetchTweets(client, tweetsEndpoint, tweetsParams, []);
			resolve(tweets);
		} catch(error) {
			console.log('ERROR in getTweets', error);
			reject(error);
		}
	})
}

module.exports = getTweets;