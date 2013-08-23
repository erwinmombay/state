// Generated by CoffeeScript 1.6.3
(function() {
  var O, RootState, State, env, expect, state, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = state = require('../'), O = _ref.O, env = _ref.env, State = _ref.State, RootState = _ref.RootState;

  expect = require('chai').expect;

  describe("Events:", function() {
    describe("Context and arguments", function() {
      var Class, Subclass, bind, fix, instance, o, _ref1;
      bind = state.bind, fix = state.fix;
      it("converts raw arguments to an array", function() {
        var o;
        state(o = {}, {
          A: state({
            enter: function(transition, args) {
              return expect(args.join(' ')).to.equal("one two three");
            }
          })
        });
        return (function(a, b, c) {
          return o.state('-> A', arguments);
        })('one', 'two', 'three');
      });
      state(o = {}, {
        A: state({
          enter: function(transition, args) {
            var currentState,
              _this = this;
            currentState = this.state();
            it("binds context to the owner", function() {
              return expect(_this).to.equal(o);
            });
            return it("provides correct arguments to transition and args params", function() {
              expect(transition).to.equal(currentState);
              return expect(args.join(' ')).to.equal("one two three");
            });
          },
          exit: bind(function(transition, args) {
            var currentState,
              _this = this;
            currentState = this.current();
            it("binds context to the local state", function() {
              return expect(_this).to.equal(o.state('A'));
            });
            return it("provides correct arguments to transition and args params", function() {
              expect(transition).to.equal(currentState);
              return expect(args.join(' ')).to.equal("one two three");
            });
          })
        })
      });
      describe("with a normal function", function() {
        return o.state('-> A', ['one', 'two', 'three']);
      });
      describe("with a state-bound function", function() {
        return o.state('->', ['one', 'two', 'three']);
      });
      Class = (function() {
        function Class() {}

        state(Class.prototype, {
          A: state
        });

        return Class;

      })();
      Subclass = (function(_super) {
        __extends(Subclass, _super);

        function Subclass() {
          _ref1 = Subclass.__super__.constructor.apply(this, arguments);
          return _ref1;
        }

        state(Subclass.prototype, {
          A: state({
            enter: fix(function(autostate, protostate) {
              return function(transition, args) {
                var currentState,
                  _this = this;
                currentState = this.state();
                it("binds context for a state-fixed function to the instance", function() {
                  return expect(_this).to.equal(instance);
                });
                it("closes over the proper autostate and protostate", function() {
                  expect(autostate).to.equal(Subclass.prototype.state('A'));
                  return expect(protostate).to.equal(Class.prototype.state('A'));
                });
                return it("provides correct arguments to transition and args params", function() {
                  expect(transition).to.equal(currentState);
                  return expect(args.join(' ')).to.equal("one two three");
                });
              };
            }),
            exit: fix(function(autostate, protostate) {
              return bind(function(transition, args) {
                var currentState,
                  _this = this;
                currentState = this.current();
                it("binds context for a fixed-bound function to the state", function() {
                  expect(_this.isVirtual()).to.be.ok;
                  return expect(_this.protostate()).to.equal(Subclass.prototype.state('A'));
                });
                it("closes over the proper autostate and protostate", function() {
                  expect(autostate).to.equal(Subclass.prototype.state('A'));
                  return expect(protostate).to.equal(Class.prototype.state('A'));
                });
                return it("provides correct arguments to transition and args params", function() {
                  expect(transition).to.equal(currentState);
                  return expect(args.join(' ')).to.equal("one two three");
                });
              });
            })
          })
        });

        return Subclass;

      })(Class);
      instance = new Subclass;
      describe("with a state-fixed function", function() {
        return instance.state('-> A', ['one', 'two', 'three']);
      });
      return describe("with a fixed and bound function", function() {
        return instance.state('->', ['one', 'two', 'three']);
      });
    });
    describe("Each transitional event (`depart`, `exit`, `enter`, `arrive`)", function() {
      var addEvents, callback, log, unit;
      callback = function(e) {
        return function(transition, args) {
          return this.log("" + transition.superstate.name + ":" + e);
        };
      };
      addEvents = function(root, callbackFactory) {
        var e, s, _i, _len, _ref1, _results;
        if (callbackFactory == null) {
          callbackFactory = callback;
        }
        _ref1 = [root].concat(root.substates(true));
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          s = _ref1[_i];
          _results.push((function() {
            var _j, _len1, _ref2, _results1;
            _ref2 = ['depart', 'exit', 'enter', 'arrive'];
            _results1 = [];
            for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
              e = _ref2[_j];
              _results1.push(s.on(e, callbackFactory(e)));
            }
            return _results1;
          })());
        }
        return _results;
      };
      log = function(value) {
        this.store.push(value);
        return value;
      };
      unit = {
        expression: state({
          A: state('initial'),
          B: state({
            BA: state,
            BB: state
          })
        }),
        traverse: function(o) {
          o.state('->');
          o.state('-> B');
          o.state('-> BA');
          return o.state('-> BB');
        },
        expectation: "A:depart\nA:exit\n:arrive\n:depart\nB:enter\nB:arrive\nB:depart\nBA:enter\nBA:arrive\nBA:depart\nBA:exit\nBB:enter\nBB:arrive"
      };
      it("is emitted properly from an object’s own state tree", function() {
        var o;
        o = {
          store: [],
          log: log
        };
        state(o, unit.expression);
        addEvents(o.state(''));
        unit.traverse(o);
        return expect(o.store.join('\n')).to.equal(unit.expectation);
      });
      return it("is emitted properly via prototype", function() {
        var Class, o;
        Class = (function() {
          function Class() {
            this.store = [];
          }

          Class.prototype.log = log;

          state(Class.prototype, unit.expression);

          addEvents(Class.prototype.state(''));

          return Class;

        })();
        state(o = new Class);
        unit.traverse(o);
        return expect(o.store.join('\n')).to.equal(unit.expectation);
      });
    });
    describe("Each existential event (`construct`, `destroy`)", function() {});
    return describe("The `mutate` event", function() {});
  });

}).call(this);