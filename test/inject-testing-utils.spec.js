/* global suite, test */

import chai from 'chai';
import { assert } from 'chai';

import spies from 'chai-spies';
import spiesTdd from 'chai-spies-tdd';

chai.use(spies)
chai.use(spiesTdd);

import { Rx } from 'cyclejs';

import injectTestingUtils from '../src/inject-testing-utils';

suite('injectTestingUtils', () => {

    test('should be a function', () => {
        assert.isFunction(injectTestingUtils);
    });

    test('should throw if argument is not a function', () => {
        assert.throws(() => injectTestingUtils());

        assert.throws(() => injectTestingUtils({}));

        assert.throws(() => injectTestingUtils([]));
    });

    test('should return a function', () => {
        assert.isFunction(injectTestingUtils(() => {}));
    });

    test('should call passed function imediatelly when returned function called', () => {
        let fn = chai.spy();

        injectTestingUtils(() => fn())();

        assert.calledOnce(fn);
    });

    test('should return value returned by passed function', () => {
        let expectedResult = { };
        let result = injectTestingUtils(() => expectedResult)();

        assert.strictEqual(result, expectedResult);
    });


    suite('injecting', () => {

        test('should inject some functions', () => {

            injectTestingUtils((
                mockInteractions,
                callWithObservables,
                getValues,
                getMessages,
                createObservable,
                render,
                onNext
            ) => {
                assert.isFunction(mockInteractions);
                assert.isFunction(callWithObservables);
                assert.isFunction(getValues);
                assert.isFunction(getMessages);
                assert.isFunction(createObservable);
                assert.isFunction(render);
                assert.isFunction(onNext);
            })();

        });

        test('should pass done function', () => {
            let outerDone = () => {};
            let injectedDone;

            injectTestingUtils((done) => {
                injectedDone = done;
            })(outerDone);

            assert.strictEqual(outerDone, injectedDone);
        });

        test('should throw is passed function has parameter not matching to any injectable', () => {

            assert.throws(() =>
                injectTestingUtils((cheshireCat, theHatter) => { })()
            );

        });

    });

});