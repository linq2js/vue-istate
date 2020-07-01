<template>
  <div>
    <h1 id="output">{{ count }}</h1>
    <div id="loadable-loading" v-if="loadable.state === 'loading'"></div>
    <div id="loadable-value" v-else>{{ loadable.value }}</div>
    <div id="default-async-count">{{ defaultAsyncCount }}</div>
    <input type="text" id="message" v-model="message" />
    <button v-on:click="increase" id="increase"></button>
    <button v-on:click="increaseAsync" id="increase-async"></button>
  </div>
</template>
<script>
import connect, {loadable, model} from '../../src/index';
import {delay} from '../../src/testUtils';
import state from 'istate';
const count = state(0);
const message = state('hi');
const asyncCount = state(async () => {
  await delay(20);
  return 100;
});
export function increase() {
  const [, setCount] = count();
  setCount((prev) => prev + 1);
}

async function increaseAsync() {
  await delay(20);
  increase();
}

export function reset() {
  count.reset();
  asyncCount.reset();
}

function create(bindings) {
  return connect(
    {
      count: count(),
      loadable: loadable(asyncCount),
      message: model(message),
      defaultAsyncCount: loadable(asyncCount, 'Loading...'),
      increase,
      increaseAsync,
      something: true,
    },
    bindings,
  );
}

export const counterMethods = {
  create,
  reset,
  increaseAsync,
  increase,
  message,
};

export default {};
</script>
