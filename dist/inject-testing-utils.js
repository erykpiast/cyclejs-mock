'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports['default'] = injectTestingUtils;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _slicedToArray(arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _Rx = require('cyclejs');

require('cyclejs/node_modules/rx/dist/rx.virtualtime');

// this call extends Rx above with VirtualTime class and HAS TO be included BEFORE rx.testing

require('cyclejs/node_modules/rx/dist/rx.testing');

var _createElement = require('cyclejs/node_modules/virtual-dom/create-element');

var _createElement2 = _interopRequireDefault(_createElement);

var _getParametersNames = require('get-parameter-names');

var _getParametersNames2 = _interopRequireDefault(_getParametersNames);

var _DI = require('just-di');

var _DI2 = _interopRequireDefault(_DI);

function injectTestingUtils(fn) {
    if ('function' !== typeof fn) {
        throw new TypeError('The first argument has to be a function');
    }

    var scheduler = new _Rx.Rx.TestScheduler();

    var injector = new _DI2['default']().define('mockInteractions', mockInteractions).define('callWithObservables', callWithObservables).define('createObservable', createObservable).define('render', _createElement2['default']).define('getValues', getValues).define('getMessages', getMessages).define('onNext', function () {
        var _Rx$ReactiveTest;

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        return (_Rx$ReactiveTest = _Rx.Rx.ReactiveTest).onNext.apply(_Rx$ReactiveTest, args);
    }).define('onCompleted', function () {
        var _Rx$ReactiveTest2;

        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
        }

        return (_Rx$ReactiveTest2 = _Rx.Rx.ReactiveTest).onCompleted.apply(_Rx$ReactiveTest2, args);
    }).define('onError', function () {
        var _Rx$ReactiveTest3;

        for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            args[_key3] = arguments[_key3];
        }

        return (_Rx$ReactiveTest3 = _Rx.Rx.ReactiveTest).onError.apply(_Rx$ReactiveTest3, args);
    });

    /**
     * @function createObservable - creates hot observable with arguments as values
     * @returns {HotObservable}
     */
    function createObservable() {
        for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
            args[_key4] = arguments[_key4];
        }

        return scheduler.createHotObservable.apply(scheduler, args);
    }

    /**
     * @function mockInteractions - creates fake interactions object
     * @param {Object} [definitionObj={}] - collection of observables to use as the interaction
     * @property {*} definitionObj[interactionName] - definition of Observable mock for given interaction
     *      interactionName has format "selector@event", ex. "#field@input", ".button@click"
     *      if value other than observable is provided, hot Observable starting with this value is created
     *      if any of function argument is missing, empty hot Observable is created
     * @returns {Object{ interactions mock
     *     @property {Function} choose - choose function returning Observables
     */
    function mockInteractions() {
        var definitionObj = arguments[0] === undefined ? {} : arguments[0];

        var eventsMap = {};

        Object.keys(definitionObj).forEach(function (name) {
            var _name$split = name.split('@');

            var _name$split2 = _slicedToArray(_name$split, 2);

            var selector = _name$split2[0];
            var event = _name$split2[1];

            if (!eventsMap.hasOwnProperty(selector)) {
                eventsMap[selector] = {};
            }

            if (definitionObj[name] instanceof _Rx.Rx.Observable) {
                eventsMap[selector][event] = definitionObj[name];
            } else {
                eventsMap[selector][event] = createObservable(scheduler, _Rx.Rx.ReactiveTest.onNext(20, definitionObj[name]));
            }
        });

        return {
            /**
             * @method choose - signature equal with real interactions.choose
             */
            choose: function choose(selector, event) {
                if (!eventsMap.hasOwnProperty(selector)) {
                    eventsMap[selector] = {};
                }

                if (!eventsMap[selector].hasOwnProperty(event)) {
                    eventsMap[selector][event] = createObservable();
                }

                return eventsMap[selector][event];
            }
        };
    }

    /**
     * @function callWithObservables - calls function with arguments specified as keys of the object
     * @param {Object} [observables={}] - collection of observables to use as the function arguments
     * @property {*} observables[observableName] - definition of Observable mock for given name
     *      if value other than observable is provided, hot Observable starting with this value is created
     *      if any of function argument is missing, empty hot Observable is created
     * @returns {Observable} value returned from the function
     */
    function callWithObservables(fn) {
        var observables = arguments[1] === undefined ? {} : arguments[1];

        var providedArgs = {};

        Object.keys(observables).forEach(function (name) {
            if (observables[name] instanceof _Rx.Rx.Observable) {
                providedArgs[name] = observables[name];
            } else {
                providedArgs[name] = createObservable(_Rx.Rx.ReactiveTest.onNext(11, observables[name]));
            }
        });

        var fnArgs = _getParametersNames2['default'](fn).map(function (name) {
            if (!(providedArgs[name] instanceof _Rx.Rx.Observable)) {
                return createObservable();
            } else {
                return providedArgs[name];
            }
        });

        return fn.apply(undefined, _toConsumableArray(fnArgs));
    }

    /**
     * @function getValues - starts observable with virtual timer and extracts values
     * @param {Observable} observable - observable to start
     * @returns {Array} collection of values
     *     @property {*} [n] - single value
     */
    function getValues(observable) {
        return getMessages(observable).map(function (message) {
            return message.value.value;
        });
    }

    /**
     * @function getMessages - starts observable with virtual timer and returns messages
     * @param {Observable} observable - observable to start
     * @returns {Array} collection of message
     *     @property {Object} [n] - object with the same format like returned by onNext
     */
    function getMessages(observable) {
        return scheduler.startWithTiming(function () {
            return observable;
        }, 1, 10, 100000).messages;
    }

    if (_getParametersNames2['default'](fn).indexOf('done') !== -1) {
        return function (done) {
            injector.define('done', done);

            return injector.use(fn);
        };
    } else {
        return function () {
            return injector.use(fn);
        };
    }
}

module.exports = exports['default'];