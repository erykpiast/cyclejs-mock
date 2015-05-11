/* global suite, test */

import chai from 'chai';
import { assert } from 'chai';

import spies from 'chai-spies';
import spiesTdd from 'chai-spies-tdd';

chai.use(spies);
chai.use(spiesTdd);

import { Rx, h } from 'cyclejs';

import equalCollection from 'chai-equal-collection';

chai.use(equalCollection(Rx.internals.isEqual));

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
                onNext,
                onCompleted
            ) => {
                assert.isFunction(mockInteractions);
                assert.isFunction(callWithObservables);
                assert.isFunction(getValues);
                assert.isFunction(getMessages);
                assert.isFunction(createObservable);
                assert.isFunction(render);
                assert.isFunction(onNext);
                assert.isFunction(onCompleted);
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


    suite('mockInteractions', () => {

        test('should return object with `choose` method',
        injectTestingUtils((mockInteractions) => {
            let mock = mockInteractions();

            assert.isObject(mock);
            assert.isFunction(mock.choose);
        }));

        test('should choose method return observable every time it is called',
        injectTestingUtils((mockInteractions) => {
            let mock = mockInteractions();

            assert.instanceOf(mock.choose(), Rx.Observable);
            assert.instanceOf(mock.choose('button', 'click'), Rx.Observable);
            assert.instanceOf(mock.choose('#field', 'input'), Rx.Observable);
            assert.instanceOf(mock.choose('abc', 'xyz'), Rx.Observable);
        }));

        test('should choose method return different observables for different arguments',
        injectTestingUtils((mockInteractions) => {
            let mock = mockInteractions();

            assert.notStrictEqual(mock.choose(), mock.choose('a', 'b'));
            assert.notStrictEqual(mock.choose('button', 'click'), mock.choose('#field', 'input'));
            assert.notStrictEqual(mock.choose('abc', 'xyz'), mock.choose('abc', 'def'));
            assert.notStrictEqual(mock.choose('abc', 'xyz'), mock.choose('def', 'xyz'));
        }));

        test('should choose method return the same observables for the same arguments',
        injectTestingUtils((mockInteractions) => {
            let mock = mockInteractions();

            assert.strictEqual(mock.choose('a', 'b'), mock.choose('a', 'b'));
            assert.strictEqual(mock.choose('button', 'click'), mock.choose('button', 'click'));
            assert.strictEqual(mock.choose('', ''), mock.choose('', ''));
            assert.strictEqual(mock.choose(), mock.choose());
        }));

        test('should choose method return observable emitting value from according property of provided object',
        injectTestingUtils((mockInteractions, getValues) => {
            let mock = mockInteractions({
                'input@input': 1
            });

            assert.deepEqual(
                getValues(mock.choose('input', 'input')),
                [ 1 ]
            );
        }));

        test('should choose method return empty observable if there is no according property in provided object',
        injectTestingUtils((mockInteractions, getValues) => {
            let mock = mockInteractions({
                'input@input': 1
            });

            assert.deepEqual(
                getValues(mock.choose('#button', 'click')),
                [ ]
            );
        }));

    });


    suite('createObservable', () => {

        test('should return observable emitting values provided as arguments',
        injectTestingUtils((createObservable, onNext, getMessages) => {
            let observable = createObservable(
                onNext(100, 'a'),
                onNext(200, 'b')
            );

            assert.equalCollection(
                getMessages(observable),
                [
                    onNext(100, 'a'),
                    onNext(200, 'b')
                ]
            );
        }));
        
        test('should return empty observable when no arguments provided',
        injectTestingUtils((createObservable, getMessages) => {
            let observable = createObservable();

            assert.equalCollection(
                getMessages(observable),
                [ ]
            );
        }));

    });
    
    
    suite('getMessages', () => {

        test('should return array of messages emited by observable sorted by time',
        injectTestingUtils((createObservable, onNext, onCompleted, getMessages) => {
            let observable = createObservable(
                onCompleted(500),
                onNext(200, 'a'),
                onNext(100, 'b')
            );

            assert.equalCollection(
                getMessages(observable),
                [
                    onNext(100, 'b'),
                    onNext(200, 'a'),
                    onCompleted(500)
                ]
            );
        }));
        
        test('should return empty array for empty observable',
        injectTestingUtils((createObservable, getMessages) => {
            let observable = createObservable();

            assert.equalCollection(
                getMessages(observable),
                [ ]
            );
        }));

    });
    
    
    suite('getValues', () => {

        test('should return array of values emited by observable sorted by time',
        injectTestingUtils((createObservable, onNext, getValues) => {
            let observable = createObservable(
                onNext(200, 'a'),
                onNext(100, 'b')
            );

            assert.equalCollection(
                getValues(observable),
                [ 'b', 'a' ]
            );
        }));
        
        test('should return null for complete signal',
        injectTestingUtils((createObservable, onCompleted, getValues) => {
            let observable = createObservable(
                onCompleted(500)
            );

            assert.equalCollection(
                getValues(observable),
                [ null ]
            );
        }));
        
        test('should return empty array for empty observable',
        injectTestingUtils((createObservable, getValues) => {
            let observable = createObservable();

            assert.equalCollection(
                getValues(observable),
                [ ]
            );
        }));

    });
    
    
    suite('callWithObservables', () => {

        test('should call passed function',
        injectTestingUtils((callWithObservables) => {
            let spy = chai.spy();
            let fn = () => spy();
            
            callWithObservables(fn);
            
            assert.calledOnce(spy);
        }));
        
        test('should call passed function with observable provided as object key',
        injectTestingUtils((callWithObservables, createObservable, getMessages, onNext, onCompleted) => {
            let args = {
                a: createObservable(
                    onNext(100, 'a1'),
                    onNext(200, 'a2'),
                    onCompleted(500)
                ),
                b: createObservable(
                    onNext(100, 'b')
                ),
                c: createObservable()
            };
            
            callWithObservables((a, b, c) => {
                assert.strictEqual(a, args.a);
                assert.strictEqual(b, args.b);
                assert.strictEqual(c, args.c);
                
                assert.equalCollection(
                    getMessages(a), [
                        onNext(100, 'a1'),
                        onNext(200, 'a2'),
                        onCompleted(500)
                    ]
                );
            }, args);
        }));

        test('should call passed function with observable emitting values provided as object key',
        injectTestingUtils((callWithObservables, getValues) => {
            let args = {
                a: 'a'
            };
            
            callWithObservables((a) => {
                assert.equalCollection(
                    getValues(a), [ args.a ]
                );
            }, args);
        }));
        
        test('should create observables for not provided arguments',
        injectTestingUtils((callWithObservables) => {
            callWithObservables((a, b, c) => {
                assert.instanceOf(a, Rx.Observable);
                assert.instanceOf(b, Rx.Observable);
                assert.instanceOf(c, Rx.Observable);
            }, { });
        }));
        
        test('should observables for not provided arguments be empty',
        injectTestingUtils((callWithObservables, getMessages) => {
            callWithObservables((a, b, c) => {
                assert.equalCollection(
                    getMessages(a), [ ]
                );
            }, { });
        }));

    });
    
    
    suite('render', () => {

        test('should return DOM tree for VirtualDOM one',
        injectTestingUtils((render) => {
            let vdom = h('div', {
                className: 'xxx',
                id: 'xyz'
            }, [
                'just text',
                h('span', 'span 1'),
                h('ul', [
                    h('li', { key: 0 }, 'li 1'),
                    h('li', { key: 1 }, 'li 2'),
                    h('li', { key: 2 }, 'li 3'),
                ])
            ]);
            
            let rendered = render(vdom);

            assert.equal(rendered.tagName, 'DIV');
            assert.equal(rendered.className, 'xxx');
            assert.equal(rendered.id, 'xyz');
            assert.equal(rendered.childNodes.length, 3);
            
            assert.equal(rendered.childNodes[0].data, 'just text');
            
            assert.equal(rendered.childNodes[1].tagName, 'SPAN');
            assert.equal(rendered.childNodes[1].childNodes.length, 1);
            assert.equal(rendered.childNodes[1].childNodes[0].data, 'span 1');
            
            assert.equal(rendered.childNodes[2].tagName, 'UL');
            assert.equal(rendered.childNodes[2].childNodes.length, 3);
            
            assert.equal(rendered.childNodes[2].childNodes[0].tagName, 'LI')
            assert.isUndefined(rendered.childNodes[2].childNodes[0].key);
            assert.equal(rendered.childNodes[2].childNodes[0].childNodes.length, 1)
            assert.equal(rendered.childNodes[2].childNodes[0].childNodes[0].data, 'li 1');
            
            assert.equal(rendered.childNodes[2].childNodes[1].tagName, 'LI')
            assert.isUndefined(rendered.childNodes[2].childNodes[1].key);
            assert.equal(rendered.childNodes[2].childNodes[1].childNodes.length, 1)
            assert.equal(rendered.childNodes[2].childNodes[1].childNodes[0].data, 'li 2');
            
            assert.equal(rendered.childNodes[2].childNodes[2].tagName, 'LI')
            assert.isUndefined(rendered.childNodes[2].childNodes[2].key);
            assert.equal(rendered.childNodes[2].childNodes[2].childNodes.length, 1)
            assert.equal(rendered.childNodes[2].childNodes[2].childNodes[0].data, 'li 3');
        }));
        
    });

});