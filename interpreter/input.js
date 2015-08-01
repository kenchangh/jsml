var R = require('ramda');
var Immutable = require('immutable');


var getLength = R.curry(function (obj) { return obj.length; });

function arrayToObject(arr, defaultValue) {
  var defaultToTrue = R.defaultTo(true);
  defaultValue = defaultToTrue(defaultValue);

  // use arr's length to generate defaultList, to avoid a R.map call
  var repeatDefault = R.repeat(defaultValue);
  var defaultList = R.compose(repeatDefault, getLength)(arr);

  var zipThenMap = R.compose(R.fromPairs, R.zip);
  return zipThenMap(arr, defaultList);
}

var splitChars = R.split('');

var PUNCTUATION = arrayToObject(splitChars(',;.()[]{}'));
var OPERATORS = arrayToObject(splitChars('+-*/%=&|<>!'));
var WHITESPACE = arrayToObject([' ', '\n', '\r']);

var KEYWORDS = [
  'var',
  'function',
];

var surround = R.curry(function(a){ return ' '+a+' '; });
var SPACED_KW = arrayToObject(R.map(surround, KEYWORDS));


var reCache = {
  digit: new RegExp('[0-9]'),
  idHead: new RegExp('[a-zA-Z_$]'),
};

/**
 * Validators
 **/
function Validator() {
  this.isDigit = R.test(reCache.digit);
  this.isIdHead = R.test(reCache.idHead);
  this.isId = R.curry(function (ch) {
    return this.isIdHead(ch) || this.isDigit(ch);
  });

  var defaultToFalse = R.defaultTo(false);
  this.isOp = R.compose(defaultToFalse, R.prop(R.__, OPERATORS));
  this.isKw = R.compose(defaultToFalse, R.prop(R.__, SPACED_KW));
  this.isPunc = R.compose(defaultToFalse, R.prop(R.__, PUNCTUATION));
  this.isSpace = R.compose(defaultToFalse, R.prop(R.__, WHITESPACE));
}


var InputContainer = function (code) {
  // init state
  var _state = Immutable.Map({
    pos: 0,
    line: 0,
    col: 0,
    code: code,
  });

  return _state;
};


var BufferContainer = function () {
  // init state
  var _state = Immutable.Map({
    code: '',
  });

  return _state;
};


var InputStream = {
  // State -> State
  next: R.curry(function (state) {
    var pos = state.get('pos');
    var line = state.get('line');
    var col = state.get('col');
    var ch = state.get('code').charAt(pos + 1);

    if (ch === '\n') {
      state = state.set('line', line + 1);
    } else {
      state = state.set('col', col + 1);
    }
    
    state = state.set('pos', pos + 1);
    return state;
  }),

  // State -> String
  peek: R.curry(function(state) {
    return R.nthChar(state.get('pos'), state.get('code'));
  }),

  // State -> Boolean
  eof: function (state) {
    return this.peek(state) === '';
  },

  meow: function (state, msg) {
    var line = state.get('line'), col = state.get('col');
    throw new Error(msg + " at line "+line+", column "+col);
  },
};

var istream = InputStream; // alias


var Tokenizer = {
  readWhile: R.curry(function (state, predicate) {
    var buff = '';

    while (!istream.eof(state) && predicate(istream.peek(state))) {
      state = istream.next(state);
      buff += state.peek(state);
    }
    return buff;
  }),

  readDigit: function (state) {

  },
};


function parse(input) {
  var val = new Validator();
  var istream = new InputStream(input);

  while (!istream.eof()) {
    var next = istream.peek();
    if (val.isDigit(next)) readDigit();
  }
}

module.exports = {
  Validator: Validator,
  InputStream: InputStream,
  InputContainer: InputContainer,
  Tokenizer: Tokenizer,
};
