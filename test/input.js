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
  var CODE = 'hello world';

  var ic = input.InputContainer(CODE);
  var istream = input.InputStream;

  describe('#peek', function () {
    it('should be first value, no state change', function () {
      istream.peek(ic).should.be.exactly(CODE[0]);
      istream.peek(ic).should.be.exactly(CODE[0]); // confirm no state changes
    });
  });

  describe('#meow', function () {
    it('should throw error', function () {
      (function(){ istream.growl(ic, 'grrr'); }).should.throw();
    });
  });

  describe('#next', function () {
    it('should reach next character', function () {
      var ch;
      for (var i=1; i<CODE.length; i++) {
        var actualCh = CODE[i];

        ic = istream.next(ic); // new state generated
        ch = ic.get('code').charAt(ic.get('pos'));

        ch.should.be.exactly(actualCh);
        istream.peek(ic).should.be.exactly(actualCh); // confirm state change
      }
    });
  });

  describe('#eof', function () {
    it('should reach eof', function () {
      // state will still change but eof is reached
      sameIc = istream.next(ic);
      Immutable.is(sameIc, ic).should.be.false();

      // after iteration, ic state should have been changed
      istream.eof(sameIc).should.be.true();
    });
  });
});


describe('Tokenizer', function () {
  var tokenizer = input.Tokenizer;
  var TYPE = 'num';
  var ic;

  describe('#readDigit', function () {
    var INT = '1234';
    var FLOAT = '12.34';
    var INVALID_FLOAT = '12.34.4';
    var HAS_OP = '12+4';

    it('should read integers', function () {
      ic = input.InputContainer(INT);
      tokenizer.readDigit(ic).token.should.match({
        type: TYPE,
        value: parseFloat(INT),
      });
    });

    it('should read floats', function () {
      ic = input.InputContainer(FLOAT);
      tokenizer.readDigit(ic).token.should.match({
        type: TYPE,
        value: parseFloat(FLOAT),
      });
    });

    it('should stop at second period', function () {
      ic = input.InputContainer(INVALID_FLOAT);
      tokenizer.readDigit(ic).token.should.match({
        type: TYPE,
        value: 12.34,
      });
    });

    it('should not include operator', function () {
      ic = input.InputContainer(HAS_OP);
      tokenizer.readDigit(ic).token.should.match({
        type: TYPE,
        value: 12,
      });
    });
  });

  describe('#readId', function () {
    var TYPE = 'id';

    it('should read valid identifiers', function () {
      var VALID_IDS = ['a_5', 'aa6', '$a', '_a'];

      for (var i=0; i<VALID_IDS.length; i++) {
        var id = VALID_IDS[i];
        ic = input.InputContainer(id);

        tokenizer.readId(ic).token.should.match({
          type: TYPE,
          value: id,
        });
      }
    });
  });
});
