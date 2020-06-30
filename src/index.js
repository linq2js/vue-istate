import {getStateList} from 'istate';
import iscope from 'iscope';

const stateChangeScope = iscope(() => undefined);

class LoadableWrapper {
  constructor(state) {
    this.state = state;
  }
}

export function useComponent() {
  const {context} = stateChangeScope() || {};
  if (!context) {
    throw new Error('useComponent should be called inside component method');
  }
  return context;
}

export function loadable(state) {
  const stateList = getStateList(state);
  if (!stateList.valid) {
    throw new Error('Invalid state');
  }
  return new LoadableWrapper(stateList.states[0]);
}

export default function connect(
  model,
  {
    data: prevDataBindings,
    methods: prevMethodBindings,
    mounted: prevMounted,
    beforeDestroy: prevBeforeDestroy,
    ...otherBindings
  } = {},
) {
  const effects = [];
  const entries = Object.entries(model);
  const propBindings = [];
  const bindings = {
    ...otherBindings,
    data() {
      const prevData = prevDataBindings
        ? typeof prevDataBindings === 'function'
          ? prevDataBindings.apply(this, arguments)
          : prevDataBindings
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
      ...prevMethodBindings,
    },
    mounted() {
      this.__unsubscribes = [];
      effects.forEach((effect) => effect(this));
    },
    beforeDestroy() {
      prevBeforeDestroy && prevBeforeDestroy.apply(this, arguments);
      this.__unsubscribes.forEach((unsubscribe) => unsubscribe());
    },
  };

  const handleChange = (context, changes) => {
    changes.forEach(([name, state]) => {
      context[name] = state.get();
    });
  };

  entries.forEach(([name, value]) => {
    if (value && value instanceof LoadableWrapper) {
      const state = value.state;
      propBindings.push([name, {get: createLoadableGetter(state)}]);
      effects.push(createLoadableEffect(name, state, handleChange));
    } else {
      const stateList = getStateList(value);
      if (stateList.valid) {
        const state = stateList.states[0];

        effects.push((currentContext) => {
          currentContext.__unsubscribes.push(
            state.subscribe(() => {
              const {context, changes} = stateChangeScope() || {};

              if (changes) {
                changes.push([name, state]);
              }

              if (currentContext && currentContext !== context) {
                handleChange(currentContext, [[name, state]]);
                currentContext.$forceUpdate();
              }
            }),
          );
        });

        propBindings.push([name, state]);
      } else if (typeof value === 'function') {
        const action = value;
        bindings.methods[name] = function () {
          let isAsync = false;
          const context = this;
          const args = arguments;
          const changes = [];
          try {
            const result = stateChangeScope({context, changes}, () =>
              action.apply(context, args),
            );

            if (result && typeof result.then === 'function') {
              isAsync = true;
              return result.finally(() => {
                handleChange(context, changes);
              });
            }

            return result;
          } finally {
            !isAsync && handleChange(context, changes);
          }
        };
      } else {
        // custom data props
        propBindings.push([name, createLiteralState(value)]);
      }
    }
  });
  return bindings;
}

function createLiteralState(value) {
  return {
    get: () => value,
  };
}

function createLoadableEffect(name, state, handleChange) {
  return (currentContext) => {
    const value = state.get();
    if (value && typeof value.then === 'function') {
      const loadable = value.loadable;
      if (loadable.state === 'loading') {
        const unsubscribe = loadable.subscribe(() => {
          handleChange(currentContext, [
            [name, {get: createLoadableGetter(state)}],
          ]);
          currentContext.$forceUpdate();
        });
        currentContext.__unsubscribes.push(unsubscribe);
      }
    }
  };
}

function createLoadableGetter(state) {
  return () => {
    const value = state.get();
    if (value && typeof value.then === 'function') {
      return {...value.loadable};
    }
    return {state: 'hasValue', value: value};
  };
}
