# cyclejs-mock
Utility for testing applications based on
[Cycle.js framework](https://github.com/staltz/cycle).

## Short API documentation

Module `cyclejs-mock` returns just one functions in which you can wrap your test
definition and get access to some useful utils. They are heavily based on
[Rx.Testing module](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/gettingstarted/testing.md),
so its documentation may be worth to read too.

```javascript
  import inject from 'cyclejs-mock';
  import { Observable } from 'rx';
  
  function functionToTest(a$, b$) {
    return Observable.combineLatest(a$, b$,
      (a, b) => a + b)
    );
  }
  
  it('should add numbers from input',
  inject((createObservable, onNext, getValues) => {
    let a$ = createObservable(onNext(100, 1), onNext(200, 2));
    let b$ = createObservable(onNext(150, 3), onNext(250, 4));
    
    let sum$ = functionToTest(a$, b$);
    
    assert.deepEqual(
      getValues(sum$),
      [ 4, 5, 6 ]
    );
  });
```

### `createObservable(...args)`

Creates a hot observable using the specified timestamped notification messages.
It accepts any number of values created by `onNext`, `onError` and `onCompleted` functions;

```javascript
  let a$ = createObservable(
    onNext(100, 1),
    onNext(200, 2),
    onCompleted(500)
  );
```
Code above creates observable that emits value `1` at time 100, value `2` at time 200
and completes at time 500.

### `onNext(ticks, value)`

It's just [`Rx.ReactiveTest.onNext` method](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/testing/reactivetest.md#rxreactivetestonnextticksvalue).
It accepts number of `VirtualTime` ticks after that a value will be emitted and value itself.

### `onCompleted(ticks)`

It's just [`Rx.ReactiveTest.onCompleted` method](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/testing/reactivetest.md#rxreactivetestoncompletedticks).
It accepts number of `VirtualTime` ticks after that a completed signal will be emitted.

### `onError(ticks, exception|predicate)`

It's just [`Rx.ReactiveTest.onError` method](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/testing/reactivetest.md#rxreactivetestonerrorticksexception).
It accepts number of `VirtualTime` ticks after that an exception will be emitted and exception itself.
If you pass function as a second argument, it will be used by custom assertion function.

```javascript
  import chai from 'chai';
  import equalCollection from 'chai-equal-collection';

  chai.use(equalCollection(Rx.internals.isEqual));

  let a$ = createObservable(
    onNext(100, 1),
    onError(200, new Error('bum!'))
  );
  
  assert.equalCollection(
    getMessages(a$), [
      onNext(100, 1),
      onError(200, (error) => error.message === 'bum!'))
    ]
  );
```

### `getMessages(observable)`

Starts the observable and returns collection of emitted values and signals.
It uses [`Rx.TestScheduler.startWithTiming`](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/testing/testscheduler.md#rxtestschedulerprototypestartwithtimingcreate-created-subscribed-disposed)
method with following time values: 1, 10, 100000 (so you can assume that it starts
on the beginning of the world and lives forever).

```javascript
  const isEqual = Rx.internals.isEqual;
  const err = new Error('bum!');

  let a$ = createObservable(
    onNext(100, 1),
    onError(200, err),
    onCompleted(1000)
  );
  
  let messages = getMessages(a$);
  
  isEqual(messages[0], onNext(100, 1));
  isEqual(messages[1], onError(200, err));
  isEqual(messages[2], onCompleted(1000));
```

### `getValues(observable)`

It's similar to `getMessages`, but returns array of values emitted by observable.

```javascript
  const err = new Error('bum!');

  let a$ = createObservable(
    onNext(100, 1),
    onError(200, err),
    onCompleted(1000)
  );
  
  let values = getValues(a$);
  
  assert.equal(values[0], 1);
  assert.equal(values[1], null);  // null for onError and onCompleted
  assert.equal(values[2], null);
```

### `render(vdom)`

Turns out VirtualDOM to real one.

```javascript
  let vdom = h('div', { className: 'my-class', 'some value');
  
  let dom = render(vdom);
  
  assert.equal(dom.outerHTML, '<div class="my-class">some value</div>');
```

You can use it to render your VirtualDOM stream with help of `getValues`.

```javascript
  let vdom$ = createObservable(
    onNext(100, h('div', { className: 'my-class', 'some value')),
    onNext(200, h('div', { className: 'your-class', 'some value')),
    onNext(300, h('div', { className: 'your-class', 'different value')),
    onNext(400, h('span', { className: 'your-class', 'different value'))
  );
  
  let doms = getValues(
    vdom$.map(render)
  );
  
  assert.equal(doms[0].outerHTML, '<div class="my-class">some value</div>');
  assert.equal(doms[1].outerHTML, '<div class="your-class">some value</div>');
  assert.equal(doms[2].outerHTML, '<div class="your-class">different value</div>');
  assert.equal(doms[3].outerHTML, '<span class="your-class">different value</span>');
```

### `callWithObservables(fn, argsDefinitionObj)`

Calls function with observables defined in passed object. You can provide observable
or just a value that should be emitted. If function has parameter with name
that can't be found in definition object, empty observable is created.

```javascript
  function functionToTest(a$, b$, c$) {
    return Rx.Observable.combineLatest(a$, b$,
      (a, b) => a + b)
    ).merge(c$);
  }
  
  let sum$ = callWithObservables(functionToTest, {
    a$: 1,
    b$: createObservable(
      onNext(100, 3),
      onNext(200, 4)
    )
  });

  assert.deepEqual(
    getValues(sum),
    [ 4, 5 ]
  );
```

### `mockInteractions(definitionObj)`

Creates mock of interactions object based on provided definition. You can define
interaction with element using key objects in format `selector@event`, ex.
`.button@click`. Pass observable to use exact value in mock or just any value to
create observable emitting it. If not defined interaction is requested, empty
observable is created.

```javascript
  let interactions = mockInteractions({
    '.button@click': createObservable(
      onNext(100, { target: { 'data-id': 'button1' } }),
      onNext(200, { target: { 'data-id': 'button2' } })
    ),
    '#field@input': 'pasted text'
  });
  
  let clicksOnButton$ = interactions.choose('.button', 'click');
  let inputsOnField$ = interactions.choose('#field', 'input');
  let keyupsOnBody$ = interactions.choose('body', 'keyup');
  
  assert.deepEqual(
    getValues(clicksOnButton$),
    [ { target: { 'data-id': 'button1' } }, { target: { 'data-id': 'button2' } } ]
  );
  assert.deepEqual(
    getValues(inputsOnField$),
    [ 'pasted text' ]
  );
  assert.deepEqual(
    getValues(keyupsOnBody$),
    [ ]
  );
```