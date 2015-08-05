var should = require('should');
var R = require('ramda');
var Immutable = require('immutable');

var input = require('../interpreter/input');


describe('Validator', function() {
  var v = input.val;

  describe('#isDigit', function () {
    it('should check if string is digit', function () {
      v.isDigit('5').should.be.true();
      v.isDigit('$').should.be.false();
      v.isDigit('a').should.be.false();
    });
  });

  describe('#isIdHead', function () {
    it('should check if string is start of id', function () {
      v.isIdHead('5').should.be.false();
      v.isIdHead('_').should.be.true();
      v.isIdHead('$').should.be.true();
      v.isIdHead('a').should.be.true();
    });
  });

  describe('#isId', function () {
    it('should check if string is part of id', function () {
      v.isId('-').should.be.false();
      v.isId('5').should.be.true();
      v.isId('_').should.be.true();
      v.isId('$').should.be.true();
      v.isId('a').should.be.true();
    });
  });

  describe('#isOp', function () {
    it('should check if string is operator', function () {
      v.isOp('+').should.be.true();
      v.isOp('-').should.be.true();
      v.isOp('5').should.be.false();
      v.isOp('_').should.be.false();
    });
  });

  describe('#isKw', function () {
    it('should check if string is keyword', function () {
      v.isKw(' var ').should.be.true();
      v.isKw(' function ').should.be.true();
      v.isKw('_').should.be.false();
      v.isKw('$').should.be.false();
      v.isKw('a').should.be.false();
    });
  });

  describe('#isPunc', function () {
    it('should check if string is punctuation', function () {
      v.isPunc(',').should.be.true();
      v.isPunc(';').should.be.true();
      v.isPunc(' function ').should.be.false();
      v.isPunc('_').should.be.false();
      v.isPunc('$').should.be.false();
      v.isPunc('a').should.be.false();
    });
  });

  describe('#isSpace', function () {
    it('should check if string is whitespace', function () {
      v.isWhitespace(' ').should.be.true();
      v.isWhitespace('\n').should.be.true();
      v.isWhitespace(',').should.be.false();
      v.isWhitespace(' function ').should.be.false();
      v.isWhitespace('_').should.be.false();
      v.isWhitespace('a').should.be.false();
    });
  });
});


// next, peek, eof, growl
describe('InputStream', function () {
  var CODE = 'hello world\nyolo';

  var state = input.InputContainer(CODE);
  var istream = input.InputStream;

  describe('#peek', function () {
    it('should be first value, no state change', function () {
      istream.peek(state).should.be.exactly(CODE[0]);
      istream.peek(state).should.be.exactly(CODE[0]); // confirm no state changes
    });
  });

  describe('#meow', function () {
    it('should throw error', function () {
      (function(){ istream.growl(state, 'grrr'); }).should.throw();
    });
  });

  describe('#next', function () {
    it('should reach next character', function () {
      var ch;
      for (var i=1; i<CODE.length; i++) {
        var actualCh = CODE[i];

        state = istream.next(state); // new state generated
        ch = state.get('code').charAt(state.get('pos'));

        //TODO: test for line number

        ch.should.be.exactly(actualCh);
        istream.peek(state).should.be.exactly(actualCh); // confirm state change
      }
    });
  });

  describe('#eof', function () {
    it('should reach eof', function () {
      // state will still change but eof is reached
      sameIc = istream.next(state);
      Immutable.is(sameIc, state).should.be.false();

      // after iteration, state state should have been changed
      istream.eof(sameIc).should.be.true();
    });
  });
});


describe('Tokenizer', function () {
  var tokenizer = input.Tokenizer;
  var istream = input.InputStream;
  var TYPE = 'num';
  var state;

  describe('#readDigit', function () {
    var INT = '1234';
    var FLOAT = '12.34';
    var INVALID_FLOAT = '12.34.4';
    var HAS_OP = '12+4';

    it('should read integers', function () {
      state = input.InputContainer(INT);
      tokenizer.readDigit(state).token.should.match({
        type: TYPE,
        value: parseFloat(INT),
      });
    });

    it('should read floats', function () {
      state = input.InputContainer(FLOAT);
      tokenizer.readDigit(state).token.should.match({
        type: TYPE,
        value: parseFloat(FLOAT),
      });
    });

    it('should stop at second period', function () {
      state = input.InputContainer(INVALID_FLOAT);
      tokenizer.readDigit(state).token.should.match({
        type: TYPE,
        value: 12.34,
      });
    });

    it('should not include operator', function () {
      state = input.InputContainer(HAS_OP);
      tokenizer.readDigit(state).token.should.match({
        type: TYPE,
        value: 12,
      });
    });
  });

  describe('#readId', function () {
    var TYPE = 'id';

    it('should read valid identifiers', function () {
      var VALID_IDS = ['a_5', 'aa6', '$a', '_a'];

      var id;
      for (var i=0; i<VALID_IDS.length; i++) {
        id = VALID_IDS[i];
        state = input.InputContainer(id);

        tokenizer.readId(state).token.should.match({
          type: TYPE,
          value: id,
        });
      }
    });
  });

  describe('#readString', function () {
    var TYPE = 'str';

    it('should read strings with single quotes', function () {
      var STRING = "'test'";
      state = input.InputContainer(STRING);
      tokenizer.readString(state, "'").token.should.match({
        type: TYPE,
        value: 'test',
      });
    });

    it('should read strings with double quotes', function () {
      var STRING = '"test"';
      state = input.InputContainer(STRING);
      tokenizer.readString(state, '"').token.should.match({
        type: TYPE,
        value: 'test',
      });
    });
  });

  describe('#skipShortComment', function () {
    it('should skip comment and get character after newline', function () {
      /**
       * All test cases should hit 'x' because the comment stops after newline
       */
      var COMMENTS = [
        '//this is ignored          \nx', // normal
        '//////aaa      \nx', // consecutive slashes
        '// /// // //   \nx', // interval between slashes
      ];

      var comment;
      for (var i=0; i<COMMENTS.length; i++) {
        comment = COMMENTS[i];
        state = input.InputContainer(comment);

        var newState = tokenizer.skipShortComment(state);

        // grab the next character after newline, which is 'x'
        istream.peek(newState).should.be.exactly('x');
      }
    });
  });

  describe('#skipLongComment', function () {
    it('should skip comment and get character after */', function () {
      /**
       * All test cases should hit 'x' because the comment stops after newline
       */
      var COMMENTS = [
        '/*   bla      */x', // normal
        '/**\n\n\nyolo *****/x', // newlines & extra asterisks
      ];

      var comment;
      for (var i=0; i<COMMENTS.length; i++) {
        // have to replicate moving into the comments
        // tokenizer has no idea how a comment starts
        comment = COMMENTS[i];

        state = input.InputContainer(comment);
        var newState = tokenizer.skipLongComment(state);

        // grab the next character after newline, which is 'x'
        istream.peek(newState).should.be.exactly('x');
      }
    });
  });

  describe('#readNext', function () {
    it('create token stream', function () {
      state = input.InputContainer('"hello world"');
      var tokens = tokenizer.next(state);
    });
  });

});
