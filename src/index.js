import {getStateList} from 'istate';
import iscope from 'iscope';

const stateChangeScope = iscope(() => null);

export default function createStore(
  model,
  {
    data: prevDataBindings,
    methods: prevMethodBindings,
    mounted: prevMounted,
    beforeDestroy: prevBeforeDestroy,
    ...otherBindings
  } = {},
) {
  let currentContext;
  const entries = Object.entries(model);
  const propBindings = [];
  const unsubscribes = [];
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
      currentContext = this;
    },
    beforeDestroy() {
      prevBeforeDestroy && prevBeforeDestroy.apply(this, arguments);
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    },
  };
  const handleHandle = (context, changes) => {
    changes.forEach(([name, state]) => (context[name] = state.get()));
  };

  entries.forEach(([name, value]) => {
    const stateList = getStateList(value);
    if (stateList.valid) {
      const state = stateList.states[0];

      unsubscribes.push(
        state.subscribe(() => {
          const {context, changes} = stateChangeScope() || {};

          if (changes) {
            changes.push([name, state]);
          }

          if (currentContext && currentContext !== context) {
            handleHandle(currentContext, [[name, state]]);
            currentContext.$forceUpdate();
          }
        }),
      );

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
              handleHandle(context, changes);
            });
          }
        } finally {
          !isAsync && handleHandle(context, changes);
        }
      };
    }
  });

  return bindings;
}
