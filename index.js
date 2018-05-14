let config = require('./config');
let MongoClient = require('mongodb').MongoClient;
let url = config.url;
let dbName = config.db;

// let config = require('./config/config.js')
let T = config.twit;

MongoClient.connect(url, function(err, db) { 
    var dbo = db.db(dbName);
    let z = dbo.collection('lastTweetIdentifier').find().limit(1).sort({$natural:-1})
    .toArray(function(error, documents) {
        // get tweets since documents[0].id and store them in the db
        documents[0].date = new Date(documents[0].date);
        let m =  (documents[0].date.getMonth() < 10) ? "0" + documents[0].date.getMonth() + 1 : documents[0].date.getMonth() + 1;
        let date = (documents[0].date.getFullYear() + m + documents[0].date.getDate()).toString();
        var lastTweetObj = { id: '', text: '', date: '' }
        // getting all tweets from after last sync
        console.log('last tweet in the system is: ' + documents[0].id);
        T.get('search/tweets', { q: '@UPS since:' + date, count: 5 }, function(err, data, response) {
            let x = data.statuses.length;
            var curr = 0;
            data.statuses.forEach((e) => { 
                // condition specifying that this is the last tweet
                // when it's the last tweet we store it's info in the DB
                if (curr === 0 && e.id !== documents[0].id) { 
                    console.log('cur and x are equal');
                    lastTweetObj.id = e.id;
                    lastTweetObj.text = e.text;
                    lastTweetObj.date = e.created_at;
                    //store the last tweets id, text, and date into the last tweet db
                    dbo.collection("lastTweetIdentifier").insertOne(lastTweetObj, function(err, res) {
                        console.log("1 document inserted: " + lastTweetObj.id);
                        db.close();
                    });
                } else { db.close(); }
                // if the id of each tweet is greater than the previous syncs last tweet id
                // then do stuff... otherwise, ignore
                console.log('x: ' + x + ' - cur: ' + curr);
                // some tweets could be the same day but already be synced with the DB
                // so we make sure that their ID is greater than the last tweet in the DB
                if (e.id > documents[0].id) { 
                    console.log('inside, id: ' + e.id + ' : ' + e.text);
                    curr++;
                    // STILL NEED TO ADD WHERE 
                    // WE SAVE TWEETS TO THE DB HERE
                    // NEED TO MAKE SEPARATE COLLECTION 
                    // SAVEDTWEETS
                } else { curr++; console.log('this tweet was already synced so we wont save it'); }
            });
        });
    });
})
/// objective: every 30 minutes a job will trigger this service
// this service will run and grab all tweets since a certain ID
// this service will then store the tweets in an MLAB MongoDB
// this service will then store the last tweet ID in the MongoDB