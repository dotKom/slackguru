var moment = require('moment');

var i12n = {
  notMade: {
    nb: 'Kaffen har ikke blitt satt på',
    nn: 'Kaffien har ikkje blitt satt på'
  },
  ready: {
    nb: 'Kaffen ble laget for ',
    nn: 'Kaffien vart laga for '
  }
};

module.exports = function(robot) {
  var getCoffee = function(res, lang) {
    robot.http('https://passoa.online.ntnu.no/api/affiliation/online')
    .get()(function(err, resHTTP, body) {
      var affilation = JSON.parse(body);
      // Check if coffee has been made
      if (!affilation || !affilation.coffee || !affilation.coffee.date) {
        res.send(i12n.notMade[lang]);
        return;
      }
      var lastCoffee = moment(affilation.coffee.date);
      // Respond with a message saying when the coffee was last made
      res.send(i12n.ready[lang] + lastCoffee.locale(lang).fromNow());
    })
  }

  robot.hear(/^!kaffe(\s|$)/i, function(res) {
    getCoffee(res, 'nb');
  });

  robot.hear(/^!kaffi(\s|$)/i, function(res) {
    getCoffee(res, 'nn');
  });
};
