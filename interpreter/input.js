var R = require('ramda');
var Immutable = require('immutable');


var TOKEN = {
  number: 'num',
  string: 'str',
  identifier: 'id',
  punctuation: 'punc',
  operator: 'op',
};


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

var defaultToFalse = R.defaultTo(false);
var val = {
  isDigit: R.test(reCache.digit),
  isIdHead: R.test(reCache.idHead),
  isId: function (ch) {
    return this.isIdHead(ch) || this.isDigit(ch);
  },
  isOp: R.compose(defaultToFalse, R.prop(R.__, OPERATORS)),
  isKw: R.compose(defaultToFalse, R.prop(R.__, SPACED_KW)),
  isPunc: R.compose(defaultToFalse, R.prop(R.__, PUNCTUATION)),
  isWhitespace: R.compose(defaultToFalse, R.prop(R.__, WHITESPACE)),
};


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
    // returns '' if index does not exist
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
  // State -> {newState: State, value: Any}
  readWhile: R.curry(function (state, predicate) {
    var buff = '';

    while (!istream.eof(state) && predicate(istream.peek(state))) {
      buff += istream.peek(state);
      state = istream.next(state);
    }

    return {
      newState: state,
      value: buff,
    };
  }),

  // (State, String) -> {newState: State, token: Token}
  readString: function readEscaped(state, end) {
    var escaped = false, buff = '';

    state = istream.next(state);
    while(!istream.eof()) {
      state = istream.next(state);
      var ch = istream.peek(state);

      if (escaped) {
        buff += ch;
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === end) {
        break;
      } else {
        buff += ch;
      }
    }

    return {
      newState: state,
      token: {
        type: TOKEN.string,
        value: buff,
      },
    };
  },

  // State -> {newState: State, token: Token}
  readId: function readId(state) {
    var change = this.readWhile(state, val.isId.bind(val));

    return {
      newState: change.newState,
      token: {
        type: TOKEN.identifier,
        value: change.value,
      }
    };
  },

  // State -> {type: String, token: Token}
  readDigit: function readDigit(state) {
    var hasDot = false;

    var pos = 0;
    var change = this.readWhile(state, function (ch) {
      if (ch === '.') {
        if (hasDot) return false;
        hasDot = true;

        return true;
      }

      return val.isDigit(ch);
    });

    return {
      newState: change.newState,
      token: {
        type: TOKEN.number,
        value: parseFloat(change.value),
      }
    };
  },

  // State -> State
  skipComment: function skipComment(state) {
    state = read_while(state, function (ch){
      return ch != '\n';
    }).newState;

    // go to next input after discovering a newline
    // return a new state to be used
    return istream.next(state);
  },

  readNext: function readNext(state) {
    /**
     * State remains constant thru this function,
     * except while ignoring whitespace
     */
    function captureState(state, type, value) {
      return {
        newState: state,
        token: {
          type: type,
          value: value,
        }
      };
    }

    state = readWhile(state, isWhitespace);

    if (input.eof(state)) return null;

    var code = state.get('code'), pos = state.get('pos');

    var ch = code.charAt(pos), nextCh = code.charAt(pos+1);
    if ((ch+nextCh) === '//') {
      state = this.skipComment(state);
      return readNext(state);
    }

    if (ch === "'") {
      return this.readString("'");
    }
        
    if (ch === '"') {
      return this.readString('"');
    }

    if (val.isDigit(ch)) {
      return this.readDigit(state);
    }

    if (val.isId(ch)) {
      return this.readId(state);
    }

    if (val.isPunc(ch)) {
      return captureState(state, TOKEN.punctuation, ch);
    }

    if (val.isOp(ch)) {
      var buff = readWhile(state, isOp);
      return captureState(state, TOKEN.operator, buff);
    }
  }
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
  val: val,
  InputStream: InputStream,
  InputContainer: InputContainer,
  Tokenizer: Tokenizer,
};
