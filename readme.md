# vue-istate

A Vue bindings for istate

## Define a state

/states/CountState.js

```js
import state from 'istate';

export default state(0);
```

## Define an action

/actions/Increase

```js
import CountState from '../states/CountState';

export default function () {
  const [count, setCount] = CountState();
  setCount(count + 1);
}
```

## Connect state and action to Vue component

```vue
<template>
  <div>
    <h1>{count}</h1>
    <button v-on:click="increase">Increase</button>
  </div>
</template>
<script>
import connect from 'vue-istate';
import CountState from '../states/CountState';
import Increase from '../actions/Increase';

export default connect(
  {
    count: CountState,
    increase: Increase,
  },
  {
    data: {
      otherDataProp: '',
    },
  },
);
</script>
```
