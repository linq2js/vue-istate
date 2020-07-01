import {getStateList} from 'istate';

const modelType = 1;
const loadableType = 2;

class StateWrapper {
  constructor(state, type, hasDefault, defaultValue) {
    this.type = type;
    this.state = state;
    this.hasDefault = hasDefault;
    this.defaultValue = defaultValue;
  }
}

function createStateWrapper(state, type, ...args) {
  const stateList = getStateList(state);
  if (!stateList.valid) {
    throw new Error('Invalid state');
  }
  return new StateWrapper(stateList.states[0], type, ...args);
}

export function model(state) {
  return createStateWrapper(state, modelType);
}

export function loadable(state, defaultValue) {
  return createStateWrapper(
    state,
    loadableType,
    arguments.length > 1,
    defaultValue,
  );
}

export default function connect(
  model,
  {
    data: customDataBinding,
    methods: customMethodsBinding,
    mounted: customMountedBinding,
    beforeDestroy: customBeforeDestroyBinding,
    watch: customWatchBinding,
    ...otherCustomBindings
  } = {},
) {
  const effects = [];
  const entries = Object.entries(model);
  const propBindings = [];
  const bindings = {
    ...otherCustomBindings,
    data() {
      const prevData = customDataBinding
        ? typeof customDataBinding === 'function'
          ? customDataBinding.apply(this, arguments)
          : customDataBinding
        : {};
      const stateProps = {};
      propBindings.forEach(([name, state]) => {
        stateProps[name] = state.get();
      });
      return {
        ...prevData,
        ...stateProps,
      };
    },
    methods: {
      ...customMethodsBinding,
    },
    mounted() {
      this.__unsubscribes = [];
      effects.forEach((effect) => effect(this));
    },
    beforeDestroy() {
      customBeforeDestroyBinding &&
        customBeforeDestroyBinding.apply(this, arguments);
      this.__unsubscribes.forEach((unsubscribe) => unsubscribe());
    },
  };

  const handleChange = (context, changes) => {
    changes.forEach(([name, state]) => {
      context[name] = state.get();
    });
  };

  entries.forEach(([name, value]) => {
    if (value && value instanceof StateWrapper) {
      const wrapper = value;
      switch (wrapper.type) {
        case loadableType:
          const fakeState = {
            ...wrapper.state,
            get: createLoadableGetter(wrapper),
          };
          propBindings.push([name, fakeState]);
          effects.push(
            createLoadableEffect(name, wrapper, handleChange),
            createStateEffect(name, fakeState, handleChange),
          );
          break;
        case modelType:
          if (!bindings.watch) {
            bindings.watch = {...customWatchBinding};
          }
          bindings.watch[name] = (newValue) => {
            if (newValue !== wrapper.state.get()) {
              wrapper.state.set(newValue);
            }
          };
          propBindings.push([name, wrapper.state]);
          effects.push(createStateEffect(name, wrapper.state, handleChange));
          break;
        default:
          throw new Error('Not supported ' + wrapper.type);
      }
    } else {
      const stateList = getStateList(value);
      if (stateList.valid) {
        const state = stateList.states[0];
        effects.push(createStateEffect(name, state, handleChange));
        propBindings.push([name, state]);
      } else if (typeof value === 'function') {
        bindings.methods[name] = value;
      } else {
        // custom data props
        propBindings.push([name, createLiteralState(value)]);
      }
    }
  });
  if (!bindings.watch && customWatchBinding) {
    bindings.watch = customWatchBinding;
  }
  return bindings;
}

function createStateEffect(name, state, handleChange) {
  return (currentContext) => {
    currentContext.__unsubscribes.push(
      state.subscribe(() => {
        handleChange(currentContext, [[name, state]]);
        currentContext.$forceUpdate();
      }),
    );
  };
}

function createLiteralState(value) {
  return {
    get: () => value,
  };
}

function createLoadableEffect(name, StateWrapper, handleChange) {
  const {state} = StateWrapper;
  return (currentContext) => {
    const value = state.get();
    if (value && typeof value.then === 'function') {
      const loadable = value.loadable;
      if (loadable.state === 'loading') {
        const unsubscribe = loadable.subscribe(() => {
          handleChange(currentContext, [
            [name, {get: createLoadableGetter(StateWrapper)}],
          ]);
          currentContext.$forceUpdate();
        });
        currentContext.__unsubscribes.push(unsubscribe);
      }
    }
  };
}

function createLoadableGetter({state, hasDefault, defaultValue}) {
  return () => {
    const value = state.get();
    if (value && typeof value.then === 'function') {
      if (hasDefault) {
        if (value.loadable.state === 'hasError') {
          throw value.loadable.error;
        }
        if (value.loadable.state === 'hasValue') {
          return value.loadable.value;
        }
        return defaultValue;
      }
      return {...value.loadable};
    }
    if (hasDefault) {
      return value;
    }
    return {state: 'hasValue', value: value};
  };
}
