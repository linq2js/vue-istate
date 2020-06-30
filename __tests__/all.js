import {shallowMount} from '@vue/test-utils';
import {delay} from '../src/testUtils';
import counterBindings, {counterMethods} from './apps/counter';
import vue from 'vue';

let wrapper;

beforeEach(() => {
  counterMethods.reset();
  wrapper && wrapper.destroy();
});

test('counter', async () => {
  const wrapper = shallowMount(counterMethods.create(counterBindings));
  const $output = wrapper.get('#output');
  const $increase = wrapper.get('#increase');
  expect($output.text()).toBe('0');
  await $increase.trigger('click');
  await $increase.trigger('click');
  expect($output.text()).toBe('2');
  counterMethods.increase();
  await vue.nextTick();
  expect($output.text()).toBe('3');
});

test('async counter', async () => {
  const wrapper = shallowMount(counterMethods.create(counterBindings));
  const $output = wrapper.get('#output');
  const $increase = wrapper.get('#increase-async');
  expect($output.text()).toBe('0');
  await $increase.trigger('click');
  await delay(30);
  await $increase.trigger('click');
  await delay(30);
  expect($output.text()).toBe('2');
  await counterMethods.increaseAsync();
  await vue.nextTick();
  await delay(30);
  expect($output.text()).toBe('3');
});

test('loadable counter', async () => {
  const wrapper = shallowMount(counterMethods.create(counterBindings));
  expect(wrapper.find('#loadable-loading').exists()).toBeTruthy();
  await delay(200);
  expect(wrapper.find('#loadable-loading').exists()).toBeFalsy();
  expect(wrapper.get('#loadable-value').text()).toBe('100');
});
