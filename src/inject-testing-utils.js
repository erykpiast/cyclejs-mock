import { Rx } from 'cyclejs';

import 'cyclejs/node_modules/rx/dist/rx.virtualtime'; // this call extends Rx above with VirtualTime class and HAS TO be included BEFORE rx.testing
import 'cyclejs/node_modules/rx/dist/rx.testing';

import createElement from 'cyclejs/node_modules/virtual-dom/create-element';

import getParametersNames from 'get-parameter-names';
import DI from 'just-di';


export default function injectTestingUtils(fn) {
    if('function' !== typeof fn) {
        throw new TypeError('The first argument has to be a function');
    }

    let scheduler = new Rx.TestScheduler();

    let injector = new DI()
        .define('mockInteractions', mockInteractions)
        .define('callWithObservables', callWithObservables)
        .define('createObservable', createObservable)
        .define('render', createElement)
        .define('getValues', getValues)
        .define('getMessages', getMessages)
        .define('onNext', (...args) => Rx.ReactiveTest.onNext(...args));


    /**
     * @function createObservable - creates hot observable with arguments as values
     * @returns {HotObservable}
     */
    function createObservable(...args) {
        return scheduler.createColdObservable(...args).shareReplay(1);
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
    function mockInteractions(definitionObj = {}) {
        var eventsMap = { };

        Object.keys(definitionObj).forEach((name) => {
            let [ selector, event ] = name.split('@');

            if(!eventsMap.hasOwnProperty(selector)) {
                eventsMap[selector] = { };
            }

            eventsMap[selector][event] = definitionObj[name];
        });

        return {
            /**
             * @method choose - signature equal with real interactions.choose
             */
            choose(selector, event) {
                if(!eventsMap.hasOwnProperty(selector)) {
                    eventsMap[selector] = { };
                }

                if(!eventsMap[selector].hasOwnProperty(event)) {
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
    function callWithObservables(fn, observables = {}) {
        let providedArgs = { };

        Object.keys(observables).forEach((name) => {
            if(observables[name] instanceof Rx.Observable) {
                providedArgs[name] = observables[name];
            } else {
                providedArgs[name] = createObservable(
                    scheduler,
                    Rx.ReactiveTest.onNext(2, observables[name])
                );
            }
        });

        let fnArgs = getParametersNames(fn).map((name) => {
            if(!(providedArgs[name] instanceof Rx.Observable)) {
                return createObservable(scheduler);
            } else {
                return providedArgs[name];
            }
        });

        return fn(...fnArgs);
    }


    /**
     * @function getValues - starts observable with virtual timer and extracts values
     * @param {Observable} observable - observable to start
     * @returns {Array} collection of values
     *     @property {*} [n] - single value
     */
    function getValues(observable) {
        return getMessages(observable)
            .map((message) => message.value.value);
    }


    /**
     * @function getMessages - starts observable with virtual timer and returns messages
     * @param {Observable} observable - observable to start
     * @returns {Array} collection of message
     *     @property {Object} [n] - object with the same format like returned by onNext
     */
    function getMessages(observable) {
        return scheduler.startWithTiming(
            () => observable,
            1,
            10,
            100000
        ).messages;
    }


    if(getParametersNames(fn).indexOf('done') !== -1) {
        return (done) => {
            injector.define('done', done);

            return injector.use(fn);
        };
    } else {
        return () => {
            return injector.use(fn);
        };
    }
}
