// Description:
//   A Last.fm plugin for Slackguru

var fs = require('fs')
var moment = require('moment')
var redis = require('redis'),
    client = redis.createClient({
      host: process.env.SLACKGURU_REDIS_HOST,
    })

var api_key = process.env.SLACKGURU_LASTFM_TOKEN
if (!api_key) {
  console.error('Missing API token for Last.FM')
}
var LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/?format=json&method=user.getrecenttracks&api_key=' + api_key

/**
 * getUserMap will query a redis instance passed in as argument, for the slack nickname provided and execute a callback function.
 *
 * @param {object} client - A redis client
 * @param {string} slackNick - The slack nick to lookup
 * @param {getLastFmNick} cb - A callback to handle the returned data
 */
var getUserMap = function(client, slackNick, cb) {
  client.hget('users', slackNick, function(err, reply) {
    if (err) {
      console.error("Something went wrong!", err)
      cb(err, reply)
    }
    cb(null, reply)
  })
}

/**
 * upsertLastFmUser is a function to insert a new Last.fm username for a user
 * @param {object} client - A redis client
 * @param {string} slackNick - The slack nick to store the data for
 * @param {string} lastfmNick - The Last.fm nick to store
 * @param {anonymous} cb - A callback to reply to the user
 */
var upsertLastFmUser = function(client, slackNick, lastfmNick, cb) {
  getUserMap(client, slackNick, function(err, reply) {
    if (err) {
      console.error("Something went wrong!", err)
      return
    }
    var data = {}
    if (reply !== null) {
      data = JSON.parse(reply.toString())
    }
    data.lastfm = lastfmNick
    client.hset("users", slackNick, JSON.stringify(data), cb)
  })
}

/**
 * getLastFmNick is a wrapper function to get the Last.FM nickname for a user,
 * which also provides a check for whether we're in a testing environment
 * @param {string} slackNick - The slack nickname for the user
 * @param {cb} cb - Anonymous callback passed down from getNowPlaying
 */
var getLastFmNick = function(slackNick, cb) {
  if (process.env.SLACKGURU_TESTING) {
    var users // used in testing only
    fs.readFile(__dirname + '/../test/users_map.json', function(err, data) {
      if (err) {
        console.error(err)
        return
      }
      users = JSON.parse(data)
      cb(null, JSON.stringify(users.users[slackNick]))
    })
  } else {
    getUserMap(client, slackNick, cb)
  }
}

/**
 * doLastFmResponse gets data from the Last.FM API
 * @param {object} robot - The hubot robot
 * @param {object} res - The message object
 * @param {string} lastfmNick - The Last.FM nick to query the API with
 */
var doLastFmResponse = function(robot, res, lastfmNick) {
  var lastfmQuery = LASTFM_API_URL + '&user=' + lastfmNick
  robot.http(lastfmQuery).get()(function(err, resHTTP, body) {
    if (err) {
      console.log("Error:", err)
      return
    }
    var content = JSON.parse(body)
    respond(res, content)
  })
}

/**
 * respond actually responds to the event.
 * @param {object} res - The message object
 * @param {object} content - JSON content from Last.FM
 */
var respond = function(res, content) {
  if (content.error !== undefined) {
    // An error is present, respond with it.
    res.reply("Something went wrong: " + content.message)
    return
  }

  if (content.recenttracks !== undefined) {
    if (content.recenttracks["@attr"] !== undefined) {
      sender = content.recenttracks["@attr"]["user"]
    }
    if (content.recenttracks.track.length > 0) {
      var nowPlaying = false
      var lastPlayed = content.recenttracks.track[0]
      // Check if this is the currently playing track
      if (lastPlayed["@attr"] !== undefined) {
        nowPlaying = lastPlayed["@attr"]["nowplaying"]
      }

      var artistAndTitle = lastPlayed["artist"]["#text"] + ' - ' + lastPlayed["name"]
      if (nowPlaying) {
        var msg = sender + ' is now playing ' + artistAndTitle
        res.send(msg)
      } else {
        var msg = sender + ' last played ' + artistAndTitle + ' (' + moment.unix(lastPlayed["date"]["uts"]).fromNow() + ')'
        res.send(msg)
      }
    } else {
      res.reply("I can't seem to find any tracks for " + sender + ' :(')
    }
  } else {
    res.reply("I can't seem to find you on Last.FM :(")
  }
}

// @ToDo: Find out how DMs work
// var dm = function(robot, res, message) {
//   var room = robot.adapter.client.rtm.dataStore.getDMByName(res.message.user.name)
//   robot.messageRoom(room.id, message)
// }

var nowplaying = function(robot) {
  var getNowPlaying = function(res) {
    var sender = res.message.user.name.toLowerCase()

    /**
     * Callback for getLastFmNick
     * @callback getLastFmNick
     * @param {string} sender - The username of the sender of the message
     */
    getLastFmNick(sender, function(err, reply) {
      if (err) {
        // Log debug if error
        console.error(err)
        return
      }
      if (reply === null) {
        // User has no record in storage
        return
      }
      var response = JSON.parse(reply.toString())
      if (response.lastfm === undefined) {
        // User has no lastfm record in storage
        return
      }
      doLastFmResponse(robot, res, response.lastfm)
    })
  }

  robot.hear(/^!np\sreg(?:ister)?\s(\S+)\s*$/i, function(res) {
    var sender = res.message.user.name.toLowerCase()
    upsertLastFmUser(client, sender, res.message.text.split(' ')[1], function() {
      // Get the inserted nickname and reply with it
      getLastFmNick(sender, function(err, reply) {
        if (err) {
          res.reply('Something went wrong: ' + err)
          return
        }
        res.reply("Done! " + JSON.parse(reply.toString()).lastfm + " is now stored as your Last.fm handle.")
      })
    })
  })

  robot.hear(/^!np(|\s)$/i, function(res) {
    getNowPlaying(res)
  })
}

module.exports = nowplaying
