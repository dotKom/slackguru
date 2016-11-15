var Helper = require('hubot-test-helper')
var nock = require('nock')
var chai = require('chai')
var fs = require('fs')
var moment = require('moment')
var expect = chai.expect

var helper = new Helper('../scripts/lastfm.js')

var users = fs.readFile(__dirname + '/users_map.json')

describe('lastfm', function() {
  before('beforeall', function() {
    nock('https://ws.audioscrobbler.com')
      .get('/2.0/')
      .query({
        method: "user.getrecenttracks",
        user: "Bob",
        api_key: "key",
        format: "json",
      })
      .reply(200, function(uri, requestBody, cb) {
        fs.readFile(__dirname + '/test_nowplaying.json' , cb);
      })
      nock('https://ws.audioscrobbler.com')
        .get('/2.0/')
        .query({
          method: "user.getrecenttracks",
          user: "John",
          api_key: "key",
          format: "json",
        })
        .reply(200, function(uri, requestBody, cb) {
          fs.readFile(__dirname + '/test_notplaying.json' , cb);
        })
  })

  beforeEach('before', function() {
    this.room = helper.createRoom()
  })

  afterEach('before', function() {
    this.room.destroy()
  })

  describe('!np', function() {
    it('should respond with current song if I say !np while scrobbling', function(done) {
      this.room.user.say('bob', '!np')
        .then(function() {})
        .catch(function(err) {})

      var that = this
      // Make sure hubot has time to respond
      setTimeout(function() {
        expect([
          ['bob', '!np'],
          ['hubot', 'Bob is now playing Photographer - Airport - Original Mix'],
        ]).to.eql(that.room.messages)
        done()
      }, 100)
    })

    it('should respond with previous song if I say !np while not scrobbling', function(done) {
      this.room.user.say('john', '!np')
        .then(function() {})
        .catch(function(err) {})

      var that = this
      // Make sure hubot has time to respond
      setTimeout(function() {
        var momentSince = moment.unix(1479142931).fromNow()
        expect([
          ['john', '!np'],
          ['hubot', 'John last played Photographer - Airport - Original Mix (' + momentSince + ')'],
        ]).to.eql(that.room.messages)
        done()
      }, 100)
    })

    it('should set and store my nick if i register', function(done) {
      this.room.user.say('thor', '!np reg Thorium')
        .then(function() {})
        .catch(function(err) {})

      var that = this
      // Make sure hubot has time to respond
      setTimeout(function() {
        var momentSince = moment.unix(1479142931).fromNow()
        expect([
          ['thor', '!np reg Thorium'],
          ['hubot', '@thor Done! Thorium is now stored as your Last.fm handle.'],
        ]).to.eql(that.room.messages)
        done()
      }, 100)
    })
  })
});
