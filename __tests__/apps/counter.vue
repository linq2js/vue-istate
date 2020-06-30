<template>
  <div>
    <h1 id="output">{{ count }}</h1>
    <div id="loadable-loading" v-if="loadable.state === 'loading'"></div>
    <div id="loadable-value" v-else>{{ loadable.value }}</div>
    <button v-on:click="increase" id="increase">Increase</button>
    <button v-on:click="increaseAsync" id="increase-async">Increase</button>
  </div>
</template>
<script>
import connect, {loadable} from '../../src/index';
import {delay} from '../../src/testUtils';
import state from 'istate';
const count = state(0);
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
};

export default {};
</script>
