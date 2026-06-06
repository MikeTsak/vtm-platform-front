"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLiveSessionBroadcasts = exports.sendLiveSessionBroadcast = exports.updateLiveSessionPlayer = exports.getLiveSessionPlayers = exports.getLiveSessionRolls = exports.logLiveSessionRoll = exports.joinLiveSession = exports.getLiveSession = exports.createLiveSession = void 0;

var _api = _interopRequireDefault(require("../api"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var base = '/live-session';

var createLiveSession = function createLiveSession(payload) {
  var _ref, data;

  return regeneratorRuntime.async(function createLiveSession$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(_api["default"].post(base, payload));

        case 2:
          _ref = _context.sent;
          data = _ref.data;
          return _context.abrupt("return", data);

        case 5:
        case "end":
          return _context.stop();
      }
    }
  });
};

exports.createLiveSession = createLiveSession;

var getLiveSession = function getLiveSession(sessionId) {
  var _ref2, data;

  return regeneratorRuntime.async(function getLiveSession$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return regeneratorRuntime.awrap(_api["default"].get("".concat(base, "/").concat(sessionId)));

        case 2:
          _ref2 = _context2.sent;
          data = _ref2.data;
          return _context2.abrupt("return", data);

        case 5:
        case "end":
          return _context2.stop();
      }
    }
  });
};

exports.getLiveSession = getLiveSession;

var joinLiveSession = function joinLiveSession(sessionId, payload) {
  var _ref3, data;

  return regeneratorRuntime.async(function joinLiveSession$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(_api["default"].post("".concat(base, "/").concat(sessionId, "/join"), payload));

        case 2:
          _ref3 = _context3.sent;
          data = _ref3.data;
          return _context3.abrupt("return", data);

        case 5:
        case "end":
          return _context3.stop();
      }
    }
  });
};

exports.joinLiveSession = joinLiveSession;

var logLiveSessionRoll = function logLiveSessionRoll(sessionId, payload) {
  var _ref4, data;

  return regeneratorRuntime.async(function logLiveSessionRoll$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(_api["default"].post("".concat(base, "/").concat(sessionId, "/rolls"), payload));

        case 2:
          _ref4 = _context4.sent;
          data = _ref4.data;
          return _context4.abrupt("return", data);

        case 5:
        case "end":
          return _context4.stop();
      }
    }
  });
};

exports.logLiveSessionRoll = logLiveSessionRoll;

var getLiveSessionRolls = function getLiveSessionRolls(sessionId) {
  var _ref5, data;

  return regeneratorRuntime.async(function getLiveSessionRolls$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return regeneratorRuntime.awrap(_api["default"].get("".concat(base, "/").concat(sessionId, "/rolls")));

        case 2:
          _ref5 = _context5.sent;
          data = _ref5.data;
          return _context5.abrupt("return", data);

        case 5:
        case "end":
          return _context5.stop();
      }
    }
  });
};

exports.getLiveSessionRolls = getLiveSessionRolls;

var getLiveSessionPlayers = function getLiveSessionPlayers(sessionId) {
  var _ref6, data;

  return regeneratorRuntime.async(function getLiveSessionPlayers$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return regeneratorRuntime.awrap(_api["default"].get("".concat(base, "/").concat(sessionId, "/players")));

        case 2:
          _ref6 = _context6.sent;
          data = _ref6.data;
          return _context6.abrupt("return", data);

        case 5:
        case "end":
          return _context6.stop();
      }
    }
  });
};

exports.getLiveSessionPlayers = getLiveSessionPlayers;

var updateLiveSessionPlayer = function updateLiveSessionPlayer(sessionId, characterId, payload) {
  var _ref7, data;

  return regeneratorRuntime.async(function updateLiveSessionPlayer$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.next = 2;
          return regeneratorRuntime.awrap(_api["default"].patch("".concat(base, "/").concat(sessionId, "/players/").concat(characterId), payload));

        case 2:
          _ref7 = _context7.sent;
          data = _ref7.data;
          return _context7.abrupt("return", data);

        case 5:
        case "end":
          return _context7.stop();
      }
    }
  });
};

exports.updateLiveSessionPlayer = updateLiveSessionPlayer;

var sendLiveSessionBroadcast = function sendLiveSessionBroadcast(sessionId, payload) {
  var _ref8, data;

  return regeneratorRuntime.async(function sendLiveSessionBroadcast$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return regeneratorRuntime.awrap(_api["default"].post("".concat(base, "/").concat(sessionId, "/broadcast"), payload));

        case 2:
          _ref8 = _context8.sent;
          data = _ref8.data;
          return _context8.abrupt("return", data);

        case 5:
        case "end":
          return _context8.stop();
      }
    }
  });
};

exports.sendLiveSessionBroadcast = sendLiveSessionBroadcast;

var getLiveSessionBroadcasts = function getLiveSessionBroadcasts(sessionId) {
  var _ref9, data;

  return regeneratorRuntime.async(function getLiveSessionBroadcasts$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.next = 2;
          return regeneratorRuntime.awrap(_api["default"].get("".concat(base, "/").concat(sessionId, "/broadcast")));

        case 2:
          _ref9 = _context9.sent;
          data = _ref9.data;
          return _context9.abrupt("return", data);

        case 5:
        case "end":
          return _context9.stop();
      }
    }
  });
};

exports.getLiveSessionBroadcasts = getLiveSessionBroadcasts;