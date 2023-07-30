/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./node_modules/alpinejs/dist/module.esm.js
// packages/alpinejs/src/scheduler.js
var flushPending = false;
var flushing = false;
var queue = [];
var lastFlushedIndex = -1;
function scheduler(callback) {
  queueJob(callback);
}
function queueJob(job) {
  if (!queue.includes(job))
    queue.push(job);
  queueFlush();
}
function dequeueJob(job) {
  let index = queue.indexOf(job);
  if (index !== -1 && index > lastFlushedIndex)
    queue.splice(index, 1);
}
function queueFlush() {
  if (!flushing && !flushPending) {
    flushPending = true;
    queueMicrotask(flushJobs);
  }
}
function flushJobs() {
  flushPending = false;
  flushing = true;
  for (let i = 0; i < queue.length; i++) {
    queue[i]();
    lastFlushedIndex = i;
  }
  queue.length = 0;
  lastFlushedIndex = -1;
  flushing = false;
}

// packages/alpinejs/src/reactivity.js
var reactive;
var effect;
var release;
var raw;
var shouldSchedule = true;
function disableEffectScheduling(callback) {
  shouldSchedule = false;
  callback();
  shouldSchedule = true;
}
function setReactivityEngine(engine) {
  reactive = engine.reactive;
  release = engine.release;
  effect = (callback) => engine.effect(callback, {scheduler: (task) => {
    if (shouldSchedule) {
      scheduler(task);
    } else {
      task();
    }
  }});
  raw = engine.raw;
}
function overrideEffect(override) {
  effect = override;
}
function elementBoundEffect(el) {
  let cleanup2 = () => {
  };
  let wrappedEffect = (callback) => {
    let effectReference = effect(callback);
    if (!el._x_effects) {
      el._x_effects = new Set();
      el._x_runEffects = () => {
        el._x_effects.forEach((i) => i());
      };
    }
    el._x_effects.add(effectReference);
    cleanup2 = () => {
      if (effectReference === void 0)
        return;
      el._x_effects.delete(effectReference);
      release(effectReference);
    };
    return effectReference;
  };
  return [wrappedEffect, () => {
    cleanup2();
  }];
}

// packages/alpinejs/src/mutation.js
var onAttributeAddeds = [];
var onElRemoveds = [];
var onElAddeds = [];
function onElAdded(callback) {
  onElAddeds.push(callback);
}
function onElRemoved(el, callback) {
  if (typeof callback === "function") {
    if (!el._x_cleanups)
      el._x_cleanups = [];
    el._x_cleanups.push(callback);
  } else {
    callback = el;
    onElRemoveds.push(callback);
  }
}
function onAttributesAdded(callback) {
  onAttributeAddeds.push(callback);
}
function onAttributeRemoved(el, name, callback) {
  if (!el._x_attributeCleanups)
    el._x_attributeCleanups = {};
  if (!el._x_attributeCleanups[name])
    el._x_attributeCleanups[name] = [];
  el._x_attributeCleanups[name].push(callback);
}
function cleanupAttributes(el, names) {
  if (!el._x_attributeCleanups)
    return;
  Object.entries(el._x_attributeCleanups).forEach(([name, value]) => {
    if (names === void 0 || names.includes(name)) {
      value.forEach((i) => i());
      delete el._x_attributeCleanups[name];
    }
  });
}
var observer = new MutationObserver(onMutate);
var currentlyObserving = false;
function startObservingMutations() {
  observer.observe(document, {subtree: true, childList: true, attributes: true, attributeOldValue: true});
  currentlyObserving = true;
}
function stopObservingMutations() {
  flushObserver();
  observer.disconnect();
  currentlyObserving = false;
}
var recordQueue = [];
var willProcessRecordQueue = false;
function flushObserver() {
  recordQueue = recordQueue.concat(observer.takeRecords());
  if (recordQueue.length && !willProcessRecordQueue) {
    willProcessRecordQueue = true;
    queueMicrotask(() => {
      processRecordQueue();
      willProcessRecordQueue = false;
    });
  }
}
function processRecordQueue() {
  onMutate(recordQueue);
  recordQueue.length = 0;
}
function mutateDom(callback) {
  if (!currentlyObserving)
    return callback();
  stopObservingMutations();
  let result = callback();
  startObservingMutations();
  return result;
}
var isCollecting = false;
var deferredMutations = [];
function deferMutations() {
  isCollecting = true;
}
function flushAndStopDeferringMutations() {
  isCollecting = false;
  onMutate(deferredMutations);
  deferredMutations = [];
}
function onMutate(mutations) {
  if (isCollecting) {
    deferredMutations = deferredMutations.concat(mutations);
    return;
  }
  let addedNodes = [];
  let removedNodes = [];
  let addedAttributes = new Map();
  let removedAttributes = new Map();
  for (let i = 0; i < mutations.length; i++) {
    if (mutations[i].target._x_ignoreMutationObserver)
      continue;
    if (mutations[i].type === "childList") {
      mutations[i].addedNodes.forEach((node) => node.nodeType === 1 && addedNodes.push(node));
      mutations[i].removedNodes.forEach((node) => node.nodeType === 1 && removedNodes.push(node));
    }
    if (mutations[i].type === "attributes") {
      let el = mutations[i].target;
      let name = mutations[i].attributeName;
      let oldValue = mutations[i].oldValue;
      let add2 = () => {
        if (!addedAttributes.has(el))
          addedAttributes.set(el, []);
        addedAttributes.get(el).push({name, value: el.getAttribute(name)});
      };
      let remove = () => {
        if (!removedAttributes.has(el))
          removedAttributes.set(el, []);
        removedAttributes.get(el).push(name);
      };
      if (el.hasAttribute(name) && oldValue === null) {
        add2();
      } else if (el.hasAttribute(name)) {
        remove();
        add2();
      } else {
        remove();
      }
    }
  }
  removedAttributes.forEach((attrs, el) => {
    cleanupAttributes(el, attrs);
  });
  addedAttributes.forEach((attrs, el) => {
    onAttributeAddeds.forEach((i) => i(el, attrs));
  });
  for (let node of removedNodes) {
    if (addedNodes.includes(node))
      continue;
    onElRemoveds.forEach((i) => i(node));
    if (node._x_cleanups) {
      while (node._x_cleanups.length)
        node._x_cleanups.pop()();
    }
  }
  addedNodes.forEach((node) => {
    node._x_ignoreSelf = true;
    node._x_ignore = true;
  });
  for (let node of addedNodes) {
    if (removedNodes.includes(node))
      continue;
    if (!node.isConnected)
      continue;
    delete node._x_ignoreSelf;
    delete node._x_ignore;
    onElAddeds.forEach((i) => i(node));
    node._x_ignore = true;
    node._x_ignoreSelf = true;
  }
  addedNodes.forEach((node) => {
    delete node._x_ignoreSelf;
    delete node._x_ignore;
  });
  addedNodes = null;
  removedNodes = null;
  addedAttributes = null;
  removedAttributes = null;
}

// packages/alpinejs/src/scope.js
function scope(node) {
  return mergeProxies(closestDataStack(node));
}
function addScopeToNode(node, data2, referenceNode) {
  node._x_dataStack = [data2, ...closestDataStack(referenceNode || node)];
  return () => {
    node._x_dataStack = node._x_dataStack.filter((i) => i !== data2);
  };
}
function closestDataStack(node) {
  if (node._x_dataStack)
    return node._x_dataStack;
  if (typeof ShadowRoot === "function" && node instanceof ShadowRoot) {
    return closestDataStack(node.host);
  }
  if (!node.parentNode) {
    return [];
  }
  return closestDataStack(node.parentNode);
}
function mergeProxies(objects) {
  let thisProxy = new Proxy({}, {
    ownKeys: () => {
      return Array.from(new Set(objects.flatMap((i) => Object.keys(i))));
    },
    has: (target, name) => {
      return objects.some((obj) => obj.hasOwnProperty(name));
    },
    get: (target, name) => {
      return (objects.find((obj) => {
        if (obj.hasOwnProperty(name)) {
          let descriptor = Object.getOwnPropertyDescriptor(obj, name);
          if (descriptor.get && descriptor.get._x_alreadyBound || descriptor.set && descriptor.set._x_alreadyBound) {
            return true;
          }
          if ((descriptor.get || descriptor.set) && descriptor.enumerable) {
            let getter = descriptor.get;
            let setter = descriptor.set;
            let property = descriptor;
            getter = getter && getter.bind(thisProxy);
            setter = setter && setter.bind(thisProxy);
            if (getter)
              getter._x_alreadyBound = true;
            if (setter)
              setter._x_alreadyBound = true;
            Object.defineProperty(obj, name, {
              ...property,
              get: getter,
              set: setter
            });
          }
          return true;
        }
        return false;
      }) || {})[name];
    },
    set: (target, name, value) => {
      let closestObjectWithKey = objects.find((obj) => obj.hasOwnProperty(name));
      if (closestObjectWithKey) {
        closestObjectWithKey[name] = value;
      } else {
        objects[objects.length - 1][name] = value;
      }
      return true;
    }
  });
  return thisProxy;
}

// packages/alpinejs/src/interceptor.js
function initInterceptors(data2) {
  let isObject2 = (val) => typeof val === "object" && !Array.isArray(val) && val !== null;
  let recurse = (obj, basePath = "") => {
    Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(([key, {value, enumerable}]) => {
      if (enumerable === false || value === void 0)
        return;
      let path = basePath === "" ? key : `${basePath}.${key}`;
      if (typeof value === "object" && value !== null && value._x_interceptor) {
        obj[key] = value.initialize(data2, path, key);
      } else {
        if (isObject2(value) && value !== obj && !(value instanceof Element)) {
          recurse(value, path);
        }
      }
    });
  };
  return recurse(data2);
}
function interceptor(callback, mutateObj = () => {
}) {
  let obj = {
    initialValue: void 0,
    _x_interceptor: true,
    initialize(data2, path, key) {
      return callback(this.initialValue, () => get(data2, path), (value) => set(data2, path, value), path, key);
    }
  };
  mutateObj(obj);
  return (initialValue) => {
    if (typeof initialValue === "object" && initialValue !== null && initialValue._x_interceptor) {
      let initialize = obj.initialize.bind(obj);
      obj.initialize = (data2, path, key) => {
        let innerValue = initialValue.initialize(data2, path, key);
        obj.initialValue = innerValue;
        return initialize(data2, path, key);
      };
    } else {
      obj.initialValue = initialValue;
    }
    return obj;
  };
}
function get(obj, path) {
  return path.split(".").reduce((carry, segment) => carry[segment], obj);
}
function set(obj, path, value) {
  if (typeof path === "string")
    path = path.split(".");
  if (path.length === 1)
    obj[path[0]] = value;
  else if (path.length === 0)
    throw error;
  else {
    if (obj[path[0]])
      return set(obj[path[0]], path.slice(1), value);
    else {
      obj[path[0]] = {};
      return set(obj[path[0]], path.slice(1), value);
    }
  }
}

// packages/alpinejs/src/magics.js
var magics = {};
function magic(name, callback) {
  magics[name] = callback;
}
function injectMagics(obj, el) {
  Object.entries(magics).forEach(([name, callback]) => {
    let memoizedUtilities = null;
    function getUtilities() {
      if (memoizedUtilities) {
        return memoizedUtilities;
      } else {
        let [utilities, cleanup2] = getElementBoundUtilities(el);
        memoizedUtilities = {interceptor, ...utilities};
        onElRemoved(el, cleanup2);
        return memoizedUtilities;
      }
    }
    Object.defineProperty(obj, `$${name}`, {
      get() {
        return callback(el, getUtilities());
      },
      enumerable: false
    });
  });
  return obj;
}

// packages/alpinejs/src/utils/error.js
function tryCatch(el, expression, callback, ...args) {
  try {
    return callback(...args);
  } catch (e) {
    handleError(e, el, expression);
  }
}
function handleError(error2, el, expression = void 0) {
  Object.assign(error2, {el, expression});
  console.warn(`Alpine Expression Error: ${error2.message}

${expression ? 'Expression: "' + expression + '"\n\n' : ""}`, el);
  setTimeout(() => {
    throw error2;
  }, 0);
}

// packages/alpinejs/src/evaluator.js
var shouldAutoEvaluateFunctions = true;
function dontAutoEvaluateFunctions(callback) {
  let cache = shouldAutoEvaluateFunctions;
  shouldAutoEvaluateFunctions = false;
  let result = callback();
  shouldAutoEvaluateFunctions = cache;
  return result;
}
function evaluate(el, expression, extras = {}) {
  let result;
  evaluateLater(el, expression)((value) => result = value, extras);
  return result;
}
function evaluateLater(...args) {
  return theEvaluatorFunction(...args);
}
var theEvaluatorFunction = normalEvaluator;
function setEvaluator(newEvaluator) {
  theEvaluatorFunction = newEvaluator;
}
function normalEvaluator(el, expression) {
  let overriddenMagics = {};
  injectMagics(overriddenMagics, el);
  let dataStack = [overriddenMagics, ...closestDataStack(el)];
  let evaluator = typeof expression === "function" ? generateEvaluatorFromFunction(dataStack, expression) : generateEvaluatorFromString(dataStack, expression, el);
  return tryCatch.bind(null, el, expression, evaluator);
}
function generateEvaluatorFromFunction(dataStack, func) {
  return (receiver = () => {
  }, {scope: scope2 = {}, params = []} = {}) => {
    let result = func.apply(mergeProxies([scope2, ...dataStack]), params);
    runIfTypeOfFunction(receiver, result);
  };
}
var evaluatorMemo = {};
function generateFunctionFromString(expression, el) {
  if (evaluatorMemo[expression]) {
    return evaluatorMemo[expression];
  }
  let AsyncFunction = Object.getPrototypeOf(async function() {
  }).constructor;
  let rightSideSafeExpression = /^[\n\s]*if.*\(.*\)/.test(expression) || /^(let|const)\s/.test(expression) ? `(async()=>{ ${expression} })()` : expression;
  const safeAsyncFunction = () => {
    try {
      return new AsyncFunction(["__self", "scope"], `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`);
    } catch (error2) {
      handleError(error2, el, expression);
      return Promise.resolve();
    }
  };
  let func = safeAsyncFunction();
  evaluatorMemo[expression] = func;
  return func;
}
function generateEvaluatorFromString(dataStack, expression, el) {
  let func = generateFunctionFromString(expression, el);
  return (receiver = () => {
  }, {scope: scope2 = {}, params = []} = {}) => {
    func.result = void 0;
    func.finished = false;
    let completeScope = mergeProxies([scope2, ...dataStack]);
    if (typeof func === "function") {
      let promise = func(func, completeScope).catch((error2) => handleError(error2, el, expression));
      if (func.finished) {
        runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
        func.result = void 0;
      } else {
        promise.then((result) => {
          runIfTypeOfFunction(receiver, result, completeScope, params, el);
        }).catch((error2) => handleError(error2, el, expression)).finally(() => func.result = void 0);
      }
    }
  };
}
function runIfTypeOfFunction(receiver, value, scope2, params, el) {
  if (shouldAutoEvaluateFunctions && typeof value === "function") {
    let result = value.apply(scope2, params);
    if (result instanceof Promise) {
      result.then((i) => runIfTypeOfFunction(receiver, i, scope2, params)).catch((error2) => handleError(error2, el, value));
    } else {
      receiver(result);
    }
  } else if (typeof value === "object" && value instanceof Promise) {
    value.then((i) => receiver(i));
  } else {
    receiver(value);
  }
}

// packages/alpinejs/src/directives.js
var prefixAsString = "x-";
function prefix(subject = "") {
  return prefixAsString + subject;
}
function setPrefix(newPrefix) {
  prefixAsString = newPrefix;
}
var directiveHandlers = {};
function directive(name, callback) {
  directiveHandlers[name] = callback;
  return {
    before(directive2) {
      if (!directiveHandlers[directive2]) {
        console.warn("Cannot find directive `${directive}`. `${name}` will use the default order of execution");
        return;
      }
      const pos = directiveOrder.indexOf(directive2);
      directiveOrder.splice(pos >= 0 ? pos : directiveOrder.indexOf("DEFAULT"), 0, name);
    }
  };
}
function directives(el, attributes, originalAttributeOverride) {
  attributes = Array.from(attributes);
  if (el._x_virtualDirectives) {
    let vAttributes = Object.entries(el._x_virtualDirectives).map(([name, value]) => ({name, value}));
    let staticAttributes = attributesOnly(vAttributes);
    vAttributes = vAttributes.map((attribute) => {
      if (staticAttributes.find((attr) => attr.name === attribute.name)) {
        return {
          name: `x-bind:${attribute.name}`,
          value: `"${attribute.value}"`
        };
      }
      return attribute;
    });
    attributes = attributes.concat(vAttributes);
  }
  let transformedAttributeMap = {};
  let directives2 = attributes.map(toTransformedAttributes((newName, oldName) => transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
  return directives2.map((directive2) => {
    return getDirectiveHandler(el, directive2);
  });
}
function attributesOnly(attributes) {
  return Array.from(attributes).map(toTransformedAttributes()).filter((attr) => !outNonAlpineAttributes(attr));
}
var isDeferringHandlers = false;
var directiveHandlerStacks = new Map();
var currentHandlerStackKey = Symbol();
function deferHandlingDirectives(callback) {
  isDeferringHandlers = true;
  let key = Symbol();
  currentHandlerStackKey = key;
  directiveHandlerStacks.set(key, []);
  let flushHandlers = () => {
    while (directiveHandlerStacks.get(key).length)
      directiveHandlerStacks.get(key).shift()();
    directiveHandlerStacks.delete(key);
  };
  let stopDeferring = () => {
    isDeferringHandlers = false;
    flushHandlers();
  };
  callback(flushHandlers);
  stopDeferring();
}
function getElementBoundUtilities(el) {
  let cleanups = [];
  let cleanup2 = (callback) => cleanups.push(callback);
  let [effect3, cleanupEffect] = elementBoundEffect(el);
  cleanups.push(cleanupEffect);
  let utilities = {
    Alpine: alpine_default,
    effect: effect3,
    cleanup: cleanup2,
    evaluateLater: evaluateLater.bind(evaluateLater, el),
    evaluate: evaluate.bind(evaluate, el)
  };
  let doCleanup = () => cleanups.forEach((i) => i());
  return [utilities, doCleanup];
}
function getDirectiveHandler(el, directive2) {
  let noop = () => {
  };
  let handler4 = directiveHandlers[directive2.type] || noop;
  let [utilities, cleanup2] = getElementBoundUtilities(el);
  onAttributeRemoved(el, directive2.original, cleanup2);
  let fullHandler = () => {
    if (el._x_ignore || el._x_ignoreSelf)
      return;
    handler4.inline && handler4.inline(el, directive2, utilities);
    handler4 = handler4.bind(handler4, el, directive2, utilities);
    isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler4) : handler4();
  };
  fullHandler.runCleanups = cleanup2;
  return fullHandler;
}
var startingWith = (subject, replacement) => ({name, value}) => {
  if (name.startsWith(subject))
    name = name.replace(subject, replacement);
  return {name, value};
};
var into = (i) => i;
function toTransformedAttributes(callback = () => {
}) {
  return ({name, value}) => {
    let {name: newName, value: newValue} = attributeTransformers.reduce((carry, transform) => {
      return transform(carry);
    }, {name, value});
    if (newName !== name)
      callback(newName, name);
    return {name: newName, value: newValue};
  };
}
var attributeTransformers = [];
function mapAttributes(callback) {
  attributeTransformers.push(callback);
}
function outNonAlpineAttributes({name}) {
  return alpineAttributeRegex().test(name);
}
var alpineAttributeRegex = () => new RegExp(`^${prefixAsString}([^:^.]+)\\b`);
function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
  return ({name, value}) => {
    let typeMatch = name.match(alpineAttributeRegex());
    let valueMatch = name.match(/:([a-zA-Z0-9\-:]+)/);
    let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
    let original = originalAttributeOverride || transformedAttributeMap[name] || name;
    return {
      type: typeMatch ? typeMatch[1] : null,
      value: valueMatch ? valueMatch[1] : null,
      modifiers: modifiers.map((i) => i.replace(".", "")),
      expression: value,
      original
    };
  };
}
var DEFAULT = "DEFAULT";
var directiveOrder = [
  "ignore",
  "ref",
  "data",
  "id",
  "bind",
  "init",
  "for",
  "model",
  "modelable",
  "transition",
  "show",
  "if",
  DEFAULT,
  "teleport"
];
function byPriority(a, b) {
  let typeA = directiveOrder.indexOf(a.type) === -1 ? DEFAULT : a.type;
  let typeB = directiveOrder.indexOf(b.type) === -1 ? DEFAULT : b.type;
  return directiveOrder.indexOf(typeA) - directiveOrder.indexOf(typeB);
}

// packages/alpinejs/src/utils/dispatch.js
function dispatch(el, name, detail = {}) {
  el.dispatchEvent(new CustomEvent(name, {
    detail,
    bubbles: true,
    composed: true,
    cancelable: true
  }));
}

// packages/alpinejs/src/utils/walk.js
function walk(el, callback) {
  if (typeof ShadowRoot === "function" && el instanceof ShadowRoot) {
    Array.from(el.children).forEach((el2) => walk(el2, callback));
    return;
  }
  let skip = false;
  callback(el, () => skip = true);
  if (skip)
    return;
  let node = el.firstElementChild;
  while (node) {
    walk(node, callback, false);
    node = node.nextElementSibling;
  }
}

// packages/alpinejs/src/utils/warn.js
function warn(message, ...args) {
  console.warn(`Alpine Warning: ${message}`, ...args);
}

// packages/alpinejs/src/lifecycle.js
var started = false;
function start() {
  if (started)
    warn("Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.");
  started = true;
  if (!document.body)
    warn("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?");
  dispatch(document, "alpine:init");
  dispatch(document, "alpine:initializing");
  startObservingMutations();
  onElAdded((el) => initTree(el, walk));
  onElRemoved((el) => destroyTree(el));
  onAttributesAdded((el, attrs) => {
    directives(el, attrs).forEach((handle) => handle());
  });
  let outNestedComponents = (el) => !closestRoot(el.parentElement, true);
  Array.from(document.querySelectorAll(allSelectors())).filter(outNestedComponents).forEach((el) => {
    initTree(el);
  });
  dispatch(document, "alpine:initialized");
}
var rootSelectorCallbacks = [];
var initSelectorCallbacks = [];
function rootSelectors() {
  return rootSelectorCallbacks.map((fn) => fn());
}
function allSelectors() {
  return rootSelectorCallbacks.concat(initSelectorCallbacks).map((fn) => fn());
}
function addRootSelector(selectorCallback) {
  rootSelectorCallbacks.push(selectorCallback);
}
function addInitSelector(selectorCallback) {
  initSelectorCallbacks.push(selectorCallback);
}
function closestRoot(el, includeInitSelectors = false) {
  return findClosest(el, (element) => {
    const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
    if (selectors.some((selector) => element.matches(selector)))
      return true;
  });
}
function findClosest(el, callback) {
  if (!el)
    return;
  if (callback(el))
    return el;
  if (el._x_teleportBack)
    el = el._x_teleportBack;
  if (!el.parentElement)
    return;
  return findClosest(el.parentElement, callback);
}
function isRoot(el) {
  return rootSelectors().some((selector) => el.matches(selector));
}
var initInterceptors2 = [];
function interceptInit(callback) {
  initInterceptors2.push(callback);
}
function initTree(el, walker = walk, intercept = () => {
}) {
  deferHandlingDirectives(() => {
    walker(el, (el2, skip) => {
      intercept(el2, skip);
      initInterceptors2.forEach((i) => i(el2, skip));
      directives(el2, el2.attributes).forEach((handle) => handle());
      el2._x_ignore && skip();
    });
  });
}
function destroyTree(root) {
  walk(root, (el) => cleanupAttributes(el));
}

// packages/alpinejs/src/nextTick.js
var tickStack = [];
var isHolding = false;
function nextTick(callback = () => {
}) {
  queueMicrotask(() => {
    isHolding || setTimeout(() => {
      releaseNextTicks();
    });
  });
  return new Promise((res) => {
    tickStack.push(() => {
      callback();
      res();
    });
  });
}
function releaseNextTicks() {
  isHolding = false;
  while (tickStack.length)
    tickStack.shift()();
}
function holdNextTicks() {
  isHolding = true;
}

// packages/alpinejs/src/utils/classes.js
function setClasses(el, value) {
  if (Array.isArray(value)) {
    return setClassesFromString(el, value.join(" "));
  } else if (typeof value === "object" && value !== null) {
    return setClassesFromObject(el, value);
  } else if (typeof value === "function") {
    return setClasses(el, value());
  }
  return setClassesFromString(el, value);
}
function setClassesFromString(el, classString) {
  let split = (classString2) => classString2.split(" ").filter(Boolean);
  let missingClasses = (classString2) => classString2.split(" ").filter((i) => !el.classList.contains(i)).filter(Boolean);
  let addClassesAndReturnUndo = (classes) => {
    el.classList.add(...classes);
    return () => {
      el.classList.remove(...classes);
    };
  };
  classString = classString === true ? classString = "" : classString || "";
  return addClassesAndReturnUndo(missingClasses(classString));
}
function setClassesFromObject(el, classObject) {
  let split = (classString) => classString.split(" ").filter(Boolean);
  let forAdd = Object.entries(classObject).flatMap(([classString, bool]) => bool ? split(classString) : false).filter(Boolean);
  let forRemove = Object.entries(classObject).flatMap(([classString, bool]) => !bool ? split(classString) : false).filter(Boolean);
  let added = [];
  let removed = [];
  forRemove.forEach((i) => {
    if (el.classList.contains(i)) {
      el.classList.remove(i);
      removed.push(i);
    }
  });
  forAdd.forEach((i) => {
    if (!el.classList.contains(i)) {
      el.classList.add(i);
      added.push(i);
    }
  });
  return () => {
    removed.forEach((i) => el.classList.add(i));
    added.forEach((i) => el.classList.remove(i));
  };
}

// packages/alpinejs/src/utils/styles.js
function setStyles(el, value) {
  if (typeof value === "object" && value !== null) {
    return setStylesFromObject(el, value);
  }
  return setStylesFromString(el, value);
}
function setStylesFromObject(el, value) {
  let previousStyles = {};
  Object.entries(value).forEach(([key, value2]) => {
    previousStyles[key] = el.style[key];
    if (!key.startsWith("--")) {
      key = kebabCase(key);
    }
    el.style.setProperty(key, value2);
  });
  setTimeout(() => {
    if (el.style.length === 0) {
      el.removeAttribute("style");
    }
  });
  return () => {
    setStyles(el, previousStyles);
  };
}
function setStylesFromString(el, value) {
  let cache = el.getAttribute("style", value);
  el.setAttribute("style", value);
  return () => {
    el.setAttribute("style", cache || "");
  };
}
function kebabCase(subject) {
  return subject.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// packages/alpinejs/src/utils/once.js
function once(callback, fallback = () => {
}) {
  let called = false;
  return function() {
    if (!called) {
      called = true;
      callback.apply(this, arguments);
    } else {
      fallback.apply(this, arguments);
    }
  };
}

// packages/alpinejs/src/directives/x-transition.js
directive("transition", (el, {value, modifiers, expression}, {evaluate: evaluate2}) => {
  if (typeof expression === "function")
    expression = evaluate2(expression);
  if (expression === false)
    return;
  if (!expression || typeof expression === "boolean") {
    registerTransitionsFromHelper(el, modifiers, value);
  } else {
    registerTransitionsFromClassString(el, expression, value);
  }
});
function registerTransitionsFromClassString(el, classString, stage) {
  registerTransitionObject(el, setClasses, "");
  let directiveStorageMap = {
    enter: (classes) => {
      el._x_transition.enter.during = classes;
    },
    "enter-start": (classes) => {
      el._x_transition.enter.start = classes;
    },
    "enter-end": (classes) => {
      el._x_transition.enter.end = classes;
    },
    leave: (classes) => {
      el._x_transition.leave.during = classes;
    },
    "leave-start": (classes) => {
      el._x_transition.leave.start = classes;
    },
    "leave-end": (classes) => {
      el._x_transition.leave.end = classes;
    }
  };
  directiveStorageMap[stage](classString);
}
function registerTransitionsFromHelper(el, modifiers, stage) {
  registerTransitionObject(el, setStyles);
  let doesntSpecify = !modifiers.includes("in") && !modifiers.includes("out") && !stage;
  let transitioningIn = doesntSpecify || modifiers.includes("in") || ["enter"].includes(stage);
  let transitioningOut = doesntSpecify || modifiers.includes("out") || ["leave"].includes(stage);
  if (modifiers.includes("in") && !doesntSpecify) {
    modifiers = modifiers.filter((i, index) => index < modifiers.indexOf("out"));
  }
  if (modifiers.includes("out") && !doesntSpecify) {
    modifiers = modifiers.filter((i, index) => index > modifiers.indexOf("out"));
  }
  let wantsAll = !modifiers.includes("opacity") && !modifiers.includes("scale");
  let wantsOpacity = wantsAll || modifiers.includes("opacity");
  let wantsScale = wantsAll || modifiers.includes("scale");
  let opacityValue = wantsOpacity ? 0 : 1;
  let scaleValue = wantsScale ? modifierValue(modifiers, "scale", 95) / 100 : 1;
  let delay = modifierValue(modifiers, "delay", 0) / 1e3;
  let origin = modifierValue(modifiers, "origin", "center");
  let property = "opacity, transform";
  let durationIn = modifierValue(modifiers, "duration", 150) / 1e3;
  let durationOut = modifierValue(modifiers, "duration", 75) / 1e3;
  let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`;
  if (transitioningIn) {
    el._x_transition.enter.during = {
      transformOrigin: origin,
      transitionDelay: `${delay}s`,
      transitionProperty: property,
      transitionDuration: `${durationIn}s`,
      transitionTimingFunction: easing
    };
    el._x_transition.enter.start = {
      opacity: opacityValue,
      transform: `scale(${scaleValue})`
    };
    el._x_transition.enter.end = {
      opacity: 1,
      transform: `scale(1)`
    };
  }
  if (transitioningOut) {
    el._x_transition.leave.during = {
      transformOrigin: origin,
      transitionDelay: `${delay}s`,
      transitionProperty: property,
      transitionDuration: `${durationOut}s`,
      transitionTimingFunction: easing
    };
    el._x_transition.leave.start = {
      opacity: 1,
      transform: `scale(1)`
    };
    el._x_transition.leave.end = {
      opacity: opacityValue,
      transform: `scale(${scaleValue})`
    };
  }
}
function registerTransitionObject(el, setFunction, defaultValue = {}) {
  if (!el._x_transition)
    el._x_transition = {
      enter: {during: defaultValue, start: defaultValue, end: defaultValue},
      leave: {during: defaultValue, start: defaultValue, end: defaultValue},
      in(before = () => {
      }, after = () => {
      }) {
        transition(el, setFunction, {
          during: this.enter.during,
          start: this.enter.start,
          end: this.enter.end
        }, before, after);
      },
      out(before = () => {
      }, after = () => {
      }) {
        transition(el, setFunction, {
          during: this.leave.during,
          start: this.leave.start,
          end: this.leave.end
        }, before, after);
      }
    };
}
window.Element.prototype._x_toggleAndCascadeWithTransitions = function(el, value, show, hide) {
  const nextTick2 = document.visibilityState === "visible" ? requestAnimationFrame : setTimeout;
  let clickAwayCompatibleShow = () => nextTick2(show);
  if (value) {
    if (el._x_transition && (el._x_transition.enter || el._x_transition.leave)) {
      el._x_transition.enter && (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
    } else {
      el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
    }
    return;
  }
  el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) => {
    el._x_transition.out(() => {
    }, () => resolve(hide));
    el._x_transitioning.beforeCancel(() => reject({isFromCancelledTransition: true}));
  }) : Promise.resolve(hide);
  queueMicrotask(() => {
    let closest = closestHide(el);
    if (closest) {
      if (!closest._x_hideChildren)
        closest._x_hideChildren = [];
      closest._x_hideChildren.push(el);
    } else {
      nextTick2(() => {
        let hideAfterChildren = (el2) => {
          let carry = Promise.all([
            el2._x_hidePromise,
            ...(el2._x_hideChildren || []).map(hideAfterChildren)
          ]).then(([i]) => i());
          delete el2._x_hidePromise;
          delete el2._x_hideChildren;
          return carry;
        };
        hideAfterChildren(el).catch((e) => {
          if (!e.isFromCancelledTransition)
            throw e;
        });
      });
    }
  });
};
function closestHide(el) {
  let parent = el.parentNode;
  if (!parent)
    return;
  return parent._x_hidePromise ? parent : closestHide(parent);
}
function transition(el, setFunction, {during, start: start2, end} = {}, before = () => {
}, after = () => {
}) {
  if (el._x_transitioning)
    el._x_transitioning.cancel();
  if (Object.keys(during).length === 0 && Object.keys(start2).length === 0 && Object.keys(end).length === 0) {
    before();
    after();
    return;
  }
  let undoStart, undoDuring, undoEnd;
  performTransition(el, {
    start() {
      undoStart = setFunction(el, start2);
    },
    during() {
      undoDuring = setFunction(el, during);
    },
    before,
    end() {
      undoStart();
      undoEnd = setFunction(el, end);
    },
    after,
    cleanup() {
      undoDuring();
      undoEnd();
    }
  });
}
function performTransition(el, stages) {
  let interrupted, reachedBefore, reachedEnd;
  let finish = once(() => {
    mutateDom(() => {
      interrupted = true;
      if (!reachedBefore)
        stages.before();
      if (!reachedEnd) {
        stages.end();
        releaseNextTicks();
      }
      stages.after();
      if (el.isConnected)
        stages.cleanup();
      delete el._x_transitioning;
    });
  });
  el._x_transitioning = {
    beforeCancels: [],
    beforeCancel(callback) {
      this.beforeCancels.push(callback);
    },
    cancel: once(function() {
      while (this.beforeCancels.length) {
        this.beforeCancels.shift()();
      }
      ;
      finish();
    }),
    finish
  };
  mutateDom(() => {
    stages.start();
    stages.during();
  });
  holdNextTicks();
  requestAnimationFrame(() => {
    if (interrupted)
      return;
    let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, "").replace("s", "")) * 1e3;
    let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, "").replace("s", "")) * 1e3;
    if (duration === 0)
      duration = Number(getComputedStyle(el).animationDuration.replace("s", "")) * 1e3;
    mutateDom(() => {
      stages.before();
    });
    reachedBefore = true;
    requestAnimationFrame(() => {
      if (interrupted)
        return;
      mutateDom(() => {
        stages.end();
      });
      releaseNextTicks();
      setTimeout(el._x_transitioning.finish, duration + delay);
      reachedEnd = true;
    });
  });
}
function modifierValue(modifiers, key, fallback) {
  if (modifiers.indexOf(key) === -1)
    return fallback;
  const rawValue = modifiers[modifiers.indexOf(key) + 1];
  if (!rawValue)
    return fallback;
  if (key === "scale") {
    if (isNaN(rawValue))
      return fallback;
  }
  if (key === "duration" || key === "delay") {
    let match = rawValue.match(/([0-9]+)ms/);
    if (match)
      return match[1];
  }
  if (key === "origin") {
    if (["top", "right", "left", "center", "bottom"].includes(modifiers[modifiers.indexOf(key) + 2])) {
      return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(" ");
    }
  }
  return rawValue;
}

// packages/alpinejs/src/clone.js
var isCloning = false;
function skipDuringClone(callback, fallback = () => {
}) {
  return (...args) => isCloning ? fallback(...args) : callback(...args);
}
function onlyDuringClone(callback) {
  return (...args) => isCloning && callback(...args);
}
function clone(oldEl, newEl) {
  if (!newEl._x_dataStack)
    newEl._x_dataStack = oldEl._x_dataStack;
  isCloning = true;
  dontRegisterReactiveSideEffects(() => {
    cloneTree(newEl);
  });
  isCloning = false;
}
function cloneTree(el) {
  let hasRunThroughFirstEl = false;
  let shallowWalker = (el2, callback) => {
    walk(el2, (el3, skip) => {
      if (hasRunThroughFirstEl && isRoot(el3))
        return skip();
      hasRunThroughFirstEl = true;
      callback(el3, skip);
    });
  };
  initTree(el, shallowWalker);
}
function dontRegisterReactiveSideEffects(callback) {
  let cache = effect;
  overrideEffect((callback2, el) => {
    let storedEffect = cache(callback2);
    release(storedEffect);
    return () => {
    };
  });
  callback();
  overrideEffect(cache);
}

// packages/alpinejs/src/utils/bind.js
function bind(el, name, value, modifiers = []) {
  if (!el._x_bindings)
    el._x_bindings = reactive({});
  el._x_bindings[name] = value;
  name = modifiers.includes("camel") ? camelCase(name) : name;
  switch (name) {
    case "value":
      bindInputValue(el, value);
      break;
    case "style":
      bindStyles(el, value);
      break;
    case "class":
      bindClasses(el, value);
      break;
    case "selected":
    case "checked":
      bindAttributeAndProperty(el, name, value);
      break;
    default:
      bindAttribute(el, name, value);
      break;
  }
}
function bindInputValue(el, value) {
  if (el.type === "radio") {
    if (el.attributes.value === void 0) {
      el.value = value;
    }
    if (window.fromModel) {
      el.checked = checkedAttrLooseCompare(el.value, value);
    }
  } else if (el.type === "checkbox") {
    if (Number.isInteger(value)) {
      el.value = value;
    } else if (!Number.isInteger(value) && !Array.isArray(value) && typeof value !== "boolean" && ![null, void 0].includes(value)) {
      el.value = String(value);
    } else {
      if (Array.isArray(value)) {
        el.checked = value.some((val) => checkedAttrLooseCompare(val, el.value));
      } else {
        el.checked = !!value;
      }
    }
  } else if (el.tagName === "SELECT") {
    updateSelect(el, value);
  } else {
    if (el.value === value)
      return;
    el.value = value;
  }
}
function bindClasses(el, value) {
  if (el._x_undoAddedClasses)
    el._x_undoAddedClasses();
  el._x_undoAddedClasses = setClasses(el, value);
}
function bindStyles(el, value) {
  if (el._x_undoAddedStyles)
    el._x_undoAddedStyles();
  el._x_undoAddedStyles = setStyles(el, value);
}
function bindAttributeAndProperty(el, name, value) {
  bindAttribute(el, name, value);
  setPropertyIfChanged(el, name, value);
}
function bindAttribute(el, name, value) {
  if ([null, void 0, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
    el.removeAttribute(name);
  } else {
    if (isBooleanAttr(name))
      value = name;
    setIfChanged(el, name, value);
  }
}
function setIfChanged(el, attrName, value) {
  if (el.getAttribute(attrName) != value) {
    el.setAttribute(attrName, value);
  }
}
function setPropertyIfChanged(el, propName, value) {
  if (el[propName] !== value) {
    el[propName] = value;
  }
}
function updateSelect(el, value) {
  const arrayWrappedValue = [].concat(value).map((value2) => {
    return value2 + "";
  });
  Array.from(el.options).forEach((option) => {
    option.selected = arrayWrappedValue.includes(option.value);
  });
}
function camelCase(subject) {
  return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
}
function checkedAttrLooseCompare(valueA, valueB) {
  return valueA == valueB;
}
function isBooleanAttr(attrName) {
  const booleanAttributes = [
    "disabled",
    "checked",
    "required",
    "readonly",
    "hidden",
    "open",
    "selected",
    "autofocus",
    "itemscope",
    "multiple",
    "novalidate",
    "allowfullscreen",
    "allowpaymentrequest",
    "formnovalidate",
    "autoplay",
    "controls",
    "loop",
    "muted",
    "playsinline",
    "default",
    "ismap",
    "reversed",
    "async",
    "defer",
    "nomodule"
  ];
  return booleanAttributes.includes(attrName);
}
function attributeShouldntBePreservedIfFalsy(name) {
  return !["aria-pressed", "aria-checked", "aria-expanded", "aria-selected"].includes(name);
}
function getBinding(el, name, fallback) {
  if (el._x_bindings && el._x_bindings[name] !== void 0)
    return el._x_bindings[name];
  return getAttributeBinding(el, name, fallback);
}
function extractProp(el, name, fallback, extract = true) {
  if (el._x_bindings && el._x_bindings[name] !== void 0)
    return el._x_bindings[name];
  if (el._x_inlineBindings && el._x_inlineBindings[name] !== void 0) {
    let binding = el._x_inlineBindings[name];
    binding.extract = extract;
    return dontAutoEvaluateFunctions(() => {
      return evaluate(el, binding.expression);
    });
  }
  return getAttributeBinding(el, name, fallback);
}
function getAttributeBinding(el, name, fallback) {
  let attr = el.getAttribute(name);
  if (attr === null)
    return typeof fallback === "function" ? fallback() : fallback;
  if (attr === "")
    return true;
  if (isBooleanAttr(name)) {
    return !![name, "true"].includes(attr);
  }
  return attr;
}

// packages/alpinejs/src/utils/debounce.js
function debounce(func, wait) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// packages/alpinejs/src/utils/throttle.js
function throttle(func, limit) {
  let inThrottle;
  return function() {
    let context = this, args = arguments;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// packages/alpinejs/src/plugin.js
function module_esm_plugin(callback) {
  let callbacks = Array.isArray(callback) ? callback : [callback];
  callbacks.forEach((i) => i(alpine_default));
}

// packages/alpinejs/src/store.js
var stores = {};
var isReactive = false;
function store(name, value) {
  if (!isReactive) {
    stores = reactive(stores);
    isReactive = true;
  }
  if (value === void 0) {
    return stores[name];
  }
  stores[name] = value;
  if (typeof value === "object" && value !== null && value.hasOwnProperty("init") && typeof value.init === "function") {
    stores[name].init();
  }
  initInterceptors(stores[name]);
}
function getStores() {
  return stores;
}

// packages/alpinejs/src/binds.js
var binds = {};
function bind2(name, bindings) {
  let getBindings = typeof bindings !== "function" ? () => bindings : bindings;
  if (name instanceof Element) {
    applyBindingsObject(name, getBindings());
  } else {
    binds[name] = getBindings;
  }
}
function injectBindingProviders(obj) {
  Object.entries(binds).forEach(([name, callback]) => {
    Object.defineProperty(obj, name, {
      get() {
        return (...args) => {
          return callback(...args);
        };
      }
    });
  });
  return obj;
}
function applyBindingsObject(el, obj, original) {
  let cleanupRunners = [];
  while (cleanupRunners.length)
    cleanupRunners.pop()();
  let attributes = Object.entries(obj).map(([name, value]) => ({name, value}));
  let staticAttributes = attributesOnly(attributes);
  attributes = attributes.map((attribute) => {
    if (staticAttributes.find((attr) => attr.name === attribute.name)) {
      return {
        name: `x-bind:${attribute.name}`,
        value: `"${attribute.value}"`
      };
    }
    return attribute;
  });
  directives(el, attributes, original).map((handle) => {
    cleanupRunners.push(handle.runCleanups);
    handle();
  });
}

// packages/alpinejs/src/datas.js
var datas = {};
function data(name, callback) {
  datas[name] = callback;
}
function injectDataProviders(obj, context) {
  Object.entries(datas).forEach(([name, callback]) => {
    Object.defineProperty(obj, name, {
      get() {
        return (...args) => {
          return callback.bind(context)(...args);
        };
      },
      enumerable: false
    });
  });
  return obj;
}

// packages/alpinejs/src/alpine.js
var Alpine = {
  get reactive() {
    return reactive;
  },
  get release() {
    return release;
  },
  get effect() {
    return effect;
  },
  get raw() {
    return raw;
  },
  version: "3.12.3",
  flushAndStopDeferringMutations,
  dontAutoEvaluateFunctions,
  disableEffectScheduling,
  startObservingMutations,
  stopObservingMutations,
  setReactivityEngine,
  closestDataStack,
  skipDuringClone,
  onlyDuringClone,
  addRootSelector,
  addInitSelector,
  addScopeToNode,
  deferMutations,
  mapAttributes,
  evaluateLater,
  interceptInit,
  setEvaluator,
  mergeProxies,
  extractProp,
  findClosest,
  closestRoot,
  destroyTree,
  interceptor,
  transition,
  setStyles,
  mutateDom,
  directive,
  throttle,
  debounce,
  evaluate,
  initTree,
  nextTick,
  prefixed: prefix,
  prefix: setPrefix,
  plugin: module_esm_plugin,
  magic,
  store,
  start,
  clone,
  bound: getBinding,
  $data: scope,
  walk,
  data,
  bind: bind2
};
var alpine_default = Alpine;

// node_modules/@vue/shared/dist/shared.esm-bundler.js
function makeMap(str, expectsLowerCase) {
  const map = Object.create(null);
  const list = str.split(",");
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase ? (val) => !!map[val.toLowerCase()] : (val) => !!map[val];
}
var PatchFlagNames = {
  [1]: `TEXT`,
  [2]: `CLASS`,
  [4]: `STYLE`,
  [8]: `PROPS`,
  [16]: `FULL_PROPS`,
  [32]: `HYDRATE_EVENTS`,
  [64]: `STABLE_FRAGMENT`,
  [128]: `KEYED_FRAGMENT`,
  [256]: `UNKEYED_FRAGMENT`,
  [512]: `NEED_PATCH`,
  [1024]: `DYNAMIC_SLOTS`,
  [2048]: `DEV_ROOT_FRAGMENT`,
  [-1]: `HOISTED`,
  [-2]: `BAIL`
};
var slotFlagsText = {
  [1]: "STABLE",
  [2]: "DYNAMIC",
  [3]: "FORWARDED"
};
var specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
var isBooleanAttr2 = /* @__PURE__ */ makeMap(specialBooleanAttrs + `,async,autofocus,autoplay,controls,default,defer,disabled,hidden,loop,open,required,reversed,scoped,seamless,checked,muted,multiple,selected`);
var EMPTY_OBJ =  true ? Object.freeze({}) : 0;
var EMPTY_ARR =  true ? Object.freeze([]) : 0;
var extend = Object.assign;
var module_esm_hasOwnProperty = Object.prototype.hasOwnProperty;
var hasOwn = (val, key) => module_esm_hasOwnProperty.call(val, key);
var isArray = Array.isArray;
var isMap = (val) => toTypeString(val) === "[object Map]";
var isString = (val) => typeof val === "string";
var isSymbol = (val) => typeof val === "symbol";
var isObject = (val) => val !== null && typeof val === "object";
var objectToString = Object.prototype.toString;
var toTypeString = (value) => objectToString.call(value);
var toRawType = (value) => {
  return toTypeString(value).slice(8, -1);
};
var isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
var cacheStringFunction = (fn) => {
  const cache = Object.create(null);
  return (str) => {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
};
var camelizeRE = /-(\w)/g;
var camelize = cacheStringFunction((str) => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
});
var hyphenateRE = /\B([A-Z])/g;
var hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, "-$1").toLowerCase());
var capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
var toHandlerKey = cacheStringFunction((str) => str ? `on${capitalize(str)}` : ``);
var hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);

// node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js
var targetMap = new WeakMap();
var effectStack = [];
var activeEffect;
var ITERATE_KEY = Symbol( true ? "iterate" : 0);
var MAP_KEY_ITERATE_KEY = Symbol( true ? "Map key iterate" : 0);
function isEffect(fn) {
  return fn && fn._isEffect === true;
}
function effect2(fn, options = EMPTY_OBJ) {
  if (isEffect(fn)) {
    fn = fn.raw;
  }
  const effect3 = createReactiveEffect(fn, options);
  if (!options.lazy) {
    effect3();
  }
  return effect3;
}
function stop(effect3) {
  if (effect3.active) {
    cleanup(effect3);
    if (effect3.options.onStop) {
      effect3.options.onStop();
    }
    effect3.active = false;
  }
}
var uid = 0;
function createReactiveEffect(fn, options) {
  const effect3 = function reactiveEffect() {
    if (!effect3.active) {
      return fn();
    }
    if (!effectStack.includes(effect3)) {
      cleanup(effect3);
      try {
        enableTracking();
        effectStack.push(effect3);
        activeEffect = effect3;
        return fn();
      } finally {
        effectStack.pop();
        resetTracking();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  };
  effect3.id = uid++;
  effect3.allowRecurse = !!options.allowRecurse;
  effect3._isEffect = true;
  effect3.active = true;
  effect3.raw = fn;
  effect3.deps = [];
  effect3.options = options;
  return effect3;
}
function cleanup(effect3) {
  const {deps} = effect3;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect3);
    }
    deps.length = 0;
  }
}
var shouldTrack = true;
var trackStack = [];
function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}
function enableTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}
function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === void 0 ? true : last;
}
function track(target, type, key) {
  if (!shouldTrack || activeEffect === void 0) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, depsMap = new Map());
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, dep = new Set());
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
    if (activeEffect.options.onTrack) {
      activeEffect.options.onTrack({
        effect: activeEffect,
        target,
        type,
        key
      });
    }
  }
}
function trigger(target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const effects = new Set();
  const add2 = (effectsToAdd) => {
    if (effectsToAdd) {
      effectsToAdd.forEach((effect3) => {
        if (effect3 !== activeEffect || effect3.allowRecurse) {
          effects.add(effect3);
        }
      });
    }
  };
  if (type === "clear") {
    depsMap.forEach(add2);
  } else if (key === "length" && isArray(target)) {
    depsMap.forEach((dep, key2) => {
      if (key2 === "length" || key2 >= newValue) {
        add2(dep);
      }
    });
  } else {
    if (key !== void 0) {
      add2(depsMap.get(key));
    }
    switch (type) {
      case "add":
        if (!isArray(target)) {
          add2(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            add2(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        } else if (isIntegerKey(key)) {
          add2(depsMap.get("length"));
        }
        break;
      case "delete":
        if (!isArray(target)) {
          add2(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            add2(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }
        break;
      case "set":
        if (isMap(target)) {
          add2(depsMap.get(ITERATE_KEY));
        }
        break;
    }
  }
  const run = (effect3) => {
    if (effect3.options.onTrigger) {
      effect3.options.onTrigger({
        effect: effect3,
        target,
        key,
        type,
        newValue,
        oldValue,
        oldTarget
      });
    }
    if (effect3.options.scheduler) {
      effect3.options.scheduler(effect3);
    } else {
      effect3();
    }
  };
  effects.forEach(run);
}
var isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol).map((key) => Symbol[key]).filter(isSymbol));
var get2 = /* @__PURE__ */ createGetter();
var shallowGet = /* @__PURE__ */ createGetter(false, true);
var readonlyGet = /* @__PURE__ */ createGetter(true);
var shallowReadonlyGet = /* @__PURE__ */ createGetter(true, true);
var arrayInstrumentations = {};
["includes", "indexOf", "lastIndexOf"].forEach((key) => {
  const method = Array.prototype[key];
  arrayInstrumentations[key] = function(...args) {
    const arr = toRaw(this);
    for (let i = 0, l = this.length; i < l; i++) {
      track(arr, "get", i + "");
    }
    const res = method.apply(arr, args);
    if (res === -1 || res === false) {
      return method.apply(arr, args.map(toRaw));
    } else {
      return res;
    }
  };
});
["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
  const method = Array.prototype[key];
  arrayInstrumentations[key] = function(...args) {
    pauseTracking();
    const res = method.apply(this, args);
    resetTracking();
    return res;
  };
});
function createGetter(isReadonly = false, shallow = false) {
  return function get3(target, key, receiver) {
    if (key === "__v_isReactive") {
      return !isReadonly;
    } else if (key === "__v_isReadonly") {
      return isReadonly;
    } else if (key === "__v_raw" && receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
      return target;
    }
    const targetIsArray = isArray(target);
    if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }
    const res = Reflect.get(target, key, receiver);
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }
    if (!isReadonly) {
      track(target, "get", key);
    }
    if (shallow) {
      return res;
    }
    if (isRef(res)) {
      const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
      return shouldUnwrap ? res.value : res;
    }
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive2(res);
    }
    return res;
  };
}
var set2 = /* @__PURE__ */ createSetter();
var shallowSet = /* @__PURE__ */ createSetter(true);
function createSetter(shallow = false) {
  return function set3(target, key, value, receiver) {
    let oldValue = target[key];
    if (!shallow) {
      value = toRaw(value);
      oldValue = toRaw(oldValue);
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
    }
    const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, "add", key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, "set", key, value, oldValue);
      }
    }
    return result;
  };
}
function deleteProperty(target, key) {
  const hadKey = hasOwn(target, key);
  const oldValue = target[key];
  const result = Reflect.deleteProperty(target, key);
  if (result && hadKey) {
    trigger(target, "delete", key, void 0, oldValue);
  }
  return result;
}
function has(target, key) {
  const result = Reflect.has(target, key);
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, "has", key);
  }
  return result;
}
function ownKeys(target) {
  track(target, "iterate", isArray(target) ? "length" : ITERATE_KEY);
  return Reflect.ownKeys(target);
}
var mutableHandlers = {
  get: get2,
  set: set2,
  deleteProperty,
  has,
  ownKeys
};
var readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    if (true) {
      console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
    }
    return true;
  },
  deleteProperty(target, key) {
    if (true) {
      console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
    }
    return true;
  }
};
var shallowReactiveHandlers = extend({}, mutableHandlers, {
  get: shallowGet,
  set: shallowSet
});
var shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet
});
var toReactive = (value) => isObject(value) ? reactive2(value) : value;
var toReadonly = (value) => isObject(value) ? readonly(value) : value;
var toShallow = (value) => value;
var getProto = (v) => Reflect.getPrototypeOf(v);
function get$1(target, key, isReadonly = false, isShallow = false) {
  target = target["__v_raw"];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, "get", key);
  }
  !isReadonly && track(rawTarget, "get", rawKey);
  const {has: has2} = getProto(rawTarget);
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
  if (has2.call(rawTarget, key)) {
    return wrap(target.get(key));
  } else if (has2.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey));
  } else if (target !== rawTarget) {
    target.get(key);
  }
}
function has$1(key, isReadonly = false) {
  const target = this["__v_raw"];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, "has", key);
  }
  !isReadonly && track(rawTarget, "has", rawKey);
  return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
}
function size(target, isReadonly = false) {
  target = target["__v_raw"];
  !isReadonly && track(toRaw(target), "iterate", ITERATE_KEY);
  return Reflect.get(target, "size", target);
}
function add(value) {
  value = toRaw(value);
  const target = toRaw(this);
  const proto = getProto(target);
  const hadKey = proto.has.call(target, value);
  if (!hadKey) {
    target.add(value);
    trigger(target, "add", value, value);
  }
  return this;
}
function set$1(key, value) {
  value = toRaw(value);
  const target = toRaw(this);
  const {has: has2, get: get3} = getProto(target);
  let hadKey = has2.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has2.call(target, key);
  } else if (true) {
    checkIdentityKeys(target, has2, key);
  }
  const oldValue = get3.call(target, key);
  target.set(key, value);
  if (!hadKey) {
    trigger(target, "add", key, value);
  } else if (hasChanged(value, oldValue)) {
    trigger(target, "set", key, value, oldValue);
  }
  return this;
}
function deleteEntry(key) {
  const target = toRaw(this);
  const {has: has2, get: get3} = getProto(target);
  let hadKey = has2.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has2.call(target, key);
  } else if (true) {
    checkIdentityKeys(target, has2, key);
  }
  const oldValue = get3 ? get3.call(target, key) : void 0;
  const result = target.delete(key);
  if (hadKey) {
    trigger(target, "delete", key, void 0, oldValue);
  }
  return result;
}
function clear() {
  const target = toRaw(this);
  const hadItems = target.size !== 0;
  const oldTarget =  true ? isMap(target) ? new Map(target) : new Set(target) : 0;
  const result = target.clear();
  if (hadItems) {
    trigger(target, "clear", void 0, void 0, oldTarget);
  }
  return result;
}
function createForEach(isReadonly, isShallow) {
  return function forEach(callback, thisArg) {
    const observed = this;
    const target = observed["__v_raw"];
    const rawTarget = toRaw(target);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    !isReadonly && track(rawTarget, "iterate", ITERATE_KEY);
    return target.forEach((value, key) => {
      return callback.call(thisArg, wrap(value), wrap(key), observed);
    });
  };
}
function createIterableMethod(method, isReadonly, isShallow) {
  return function(...args) {
    const target = this["__v_raw"];
    const rawTarget = toRaw(target);
    const targetIsMap = isMap(rawTarget);
    const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
    const isKeyOnly = method === "keys" && targetIsMap;
    const innerIterator = target[method](...args);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    !isReadonly && track(rawTarget, "iterate", isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
    return {
      next() {
        const {value, done} = innerIterator.next();
        return done ? {value, done} : {
          value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
          done
        };
      },
      [Symbol.iterator]() {
        return this;
      }
    };
  };
}
function createReadonlyMethod(type) {
  return function(...args) {
    if (true) {
      const key = args[0] ? `on key "${args[0]}" ` : ``;
      console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
    }
    return type === "delete" ? false : this;
  };
}
var mutableInstrumentations = {
  get(key) {
    return get$1(this, key);
  },
  get size() {
    return size(this);
  },
  has: has$1,
  add,
  set: set$1,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false)
};
var shallowInstrumentations = {
  get(key) {
    return get$1(this, key, false, true);
  },
  get size() {
    return size(this);
  },
  has: has$1,
  add,
  set: set$1,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, true)
};
var readonlyInstrumentations = {
  get(key) {
    return get$1(this, key, true);
  },
  get size() {
    return size(this, true);
  },
  has(key) {
    return has$1.call(this, key, true);
  },
  add: createReadonlyMethod("add"),
  set: createReadonlyMethod("set"),
  delete: createReadonlyMethod("delete"),
  clear: createReadonlyMethod("clear"),
  forEach: createForEach(true, false)
};
var shallowReadonlyInstrumentations = {
  get(key) {
    return get$1(this, key, true, true);
  },
  get size() {
    return size(this, true);
  },
  has(key) {
    return has$1.call(this, key, true);
  },
  add: createReadonlyMethod("add"),
  set: createReadonlyMethod("set"),
  delete: createReadonlyMethod("delete"),
  clear: createReadonlyMethod("clear"),
  forEach: createForEach(true, true)
};
var iteratorMethods = ["keys", "values", "entries", Symbol.iterator];
iteratorMethods.forEach((method) => {
  mutableInstrumentations[method] = createIterableMethod(method, false, false);
  readonlyInstrumentations[method] = createIterableMethod(method, true, false);
  shallowInstrumentations[method] = createIterableMethod(method, false, true);
  shallowReadonlyInstrumentations[method] = createIterableMethod(method, true, true);
});
function createInstrumentationGetter(isReadonly, shallow) {
  const instrumentations = shallow ? isReadonly ? shallowReadonlyInstrumentations : shallowInstrumentations : isReadonly ? readonlyInstrumentations : mutableInstrumentations;
  return (target, key, receiver) => {
    if (key === "__v_isReactive") {
      return !isReadonly;
    } else if (key === "__v_isReadonly") {
      return isReadonly;
    } else if (key === "__v_raw") {
      return target;
    }
    return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
  };
}
var mutableCollectionHandlers = {
  get: createInstrumentationGetter(false, false)
};
var shallowCollectionHandlers = {
  get: createInstrumentationGetter(false, true)
};
var readonlyCollectionHandlers = {
  get: createInstrumentationGetter(true, false)
};
var shallowReadonlyCollectionHandlers = {
  get: createInstrumentationGetter(true, true)
};
function checkIdentityKeys(target, has2, key) {
  const rawKey = toRaw(key);
  if (rawKey !== key && has2.call(target, rawKey)) {
    const type = toRawType(target);
    console.warn(`Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
  }
}
var reactiveMap = new WeakMap();
var shallowReactiveMap = new WeakMap();
var readonlyMap = new WeakMap();
var shallowReadonlyMap = new WeakMap();
function targetTypeMap(rawType) {
  switch (rawType) {
    case "Object":
    case "Array":
      return 1;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;
    default:
      return 0;
  }
}
function getTargetType(value) {
  return value["__v_skip"] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
}
function reactive2(target) {
  if (target && target["__v_isReadonly"]) {
    return target;
  }
  return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}
function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
}
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
  if (!isObject(target)) {
    if (true) {
      console.warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }
  if (target["__v_raw"] && !(isReadonly && target["__v_isReactive"])) {
    return target;
  }
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  const targetType = getTargetType(target);
  if (targetType === 0) {
    return target;
  }
  const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}
function toRaw(observed) {
  return observed && toRaw(observed["__v_raw"]) || observed;
}
function isRef(r) {
  return Boolean(r && r.__v_isRef === true);
}

// packages/alpinejs/src/magics/$nextTick.js
magic("nextTick", () => nextTick);

// packages/alpinejs/src/magics/$dispatch.js
magic("dispatch", (el) => dispatch.bind(dispatch, el));

// packages/alpinejs/src/magics/$watch.js
magic("watch", (el, {evaluateLater: evaluateLater2, effect: effect3}) => (key, callback) => {
  let evaluate2 = evaluateLater2(key);
  let firstTime = true;
  let oldValue;
  let effectReference = effect3(() => evaluate2((value) => {
    JSON.stringify(value);
    if (!firstTime) {
      queueMicrotask(() => {
        callback(value, oldValue);
        oldValue = value;
      });
    } else {
      oldValue = value;
    }
    firstTime = false;
  }));
  el._x_effects.delete(effectReference);
});

// packages/alpinejs/src/magics/$store.js
magic("store", getStores);

// packages/alpinejs/src/magics/$data.js
magic("data", (el) => scope(el));

// packages/alpinejs/src/magics/$root.js
magic("root", (el) => closestRoot(el));

// packages/alpinejs/src/magics/$refs.js
magic("refs", (el) => {
  if (el._x_refs_proxy)
    return el._x_refs_proxy;
  el._x_refs_proxy = mergeProxies(getArrayOfRefObject(el));
  return el._x_refs_proxy;
});
function getArrayOfRefObject(el) {
  let refObjects = [];
  let currentEl = el;
  while (currentEl) {
    if (currentEl._x_refs)
      refObjects.push(currentEl._x_refs);
    currentEl = currentEl.parentNode;
  }
  return refObjects;
}

// packages/alpinejs/src/ids.js
var globalIdMemo = {};
function findAndIncrementId(name) {
  if (!globalIdMemo[name])
    globalIdMemo[name] = 0;
  return ++globalIdMemo[name];
}
function closestIdRoot(el, name) {
  return findClosest(el, (element) => {
    if (element._x_ids && element._x_ids[name])
      return true;
  });
}
function setIdRoot(el, name) {
  if (!el._x_ids)
    el._x_ids = {};
  if (!el._x_ids[name])
    el._x_ids[name] = findAndIncrementId(name);
}

// packages/alpinejs/src/magics/$id.js
magic("id", (el) => (name, key = null) => {
  let root = closestIdRoot(el, name);
  let id = root ? root._x_ids[name] : findAndIncrementId(name);
  return key ? `${name}-${id}-${key}` : `${name}-${id}`;
});

// packages/alpinejs/src/magics/$el.js
magic("el", (el) => el);

// packages/alpinejs/src/magics/index.js
warnMissingPluginMagic("Focus", "focus", "focus");
warnMissingPluginMagic("Persist", "persist", "persist");
function warnMissingPluginMagic(name, magicName, slug) {
  magic(magicName, (el) => warn(`You can't use [$${directiveName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
}

// packages/alpinejs/src/entangle.js
function entangle({get: outerGet, set: outerSet}, {get: innerGet, set: innerSet}) {
  let firstRun = true;
  let outerHash, innerHash, outerHashLatest, innerHashLatest;
  let reference = effect(() => {
    let outer, inner;
    if (firstRun) {
      outer = outerGet();
      innerSet(outer);
      inner = innerGet();
      firstRun = false;
    } else {
      outer = outerGet();
      inner = innerGet();
      outerHashLatest = JSON.stringify(outer);
      innerHashLatest = JSON.stringify(inner);
      if (outerHashLatest !== outerHash) {
        inner = innerGet();
        innerSet(outer);
        inner = outer;
      } else {
        outerSet(inner);
        outer = inner;
      }
    }
    outerHash = JSON.stringify(outer);
    innerHash = JSON.stringify(inner);
  });
  return () => {
    release(reference);
  };
}

// packages/alpinejs/src/directives/x-modelable.js
directive("modelable", (el, {expression}, {effect: effect3, evaluateLater: evaluateLater2, cleanup: cleanup2}) => {
  let func = evaluateLater2(expression);
  let innerGet = () => {
    let result;
    func((i) => result = i);
    return result;
  };
  let evaluateInnerSet = evaluateLater2(`${expression} = __placeholder`);
  let innerSet = (val) => evaluateInnerSet(() => {
  }, {scope: {__placeholder: val}});
  let initialValue = innerGet();
  innerSet(initialValue);
  queueMicrotask(() => {
    if (!el._x_model)
      return;
    el._x_removeModelListeners["default"]();
    let outerGet = el._x_model.get;
    let outerSet = el._x_model.set;
    let releaseEntanglement = entangle({
      get() {
        return outerGet();
      },
      set(value) {
        outerSet(value);
      }
    }, {
      get() {
        return innerGet();
      },
      set(value) {
        innerSet(value);
      }
    });
    cleanup2(releaseEntanglement);
  });
});

// packages/alpinejs/src/directives/x-teleport.js
var teleportContainerDuringClone = document.createElement("div");
directive("teleport", (el, {modifiers, expression}, {cleanup: cleanup2}) => {
  if (el.tagName.toLowerCase() !== "template")
    warn("x-teleport can only be used on a <template> tag", el);
  let target = skipDuringClone(() => {
    return document.querySelector(expression);
  }, () => {
    return teleportContainerDuringClone;
  })();
  if (!target)
    warn(`Cannot find x-teleport element for selector: "${expression}"`);
  let clone2 = el.content.cloneNode(true).firstElementChild;
  el._x_teleport = clone2;
  clone2._x_teleportBack = el;
  if (el._x_forwardEvents) {
    el._x_forwardEvents.forEach((eventName) => {
      clone2.addEventListener(eventName, (e) => {
        e.stopPropagation();
        el.dispatchEvent(new e.constructor(e.type, e));
      });
    });
  }
  addScopeToNode(clone2, {}, el);
  mutateDom(() => {
    if (modifiers.includes("prepend")) {
      target.parentNode.insertBefore(clone2, target);
    } else if (modifiers.includes("append")) {
      target.parentNode.insertBefore(clone2, target.nextSibling);
    } else {
      target.appendChild(clone2);
    }
    initTree(clone2);
    clone2._x_ignore = true;
  });
  cleanup2(() => clone2.remove());
});

// packages/alpinejs/src/directives/x-ignore.js
var handler = () => {
};
handler.inline = (el, {modifiers}, {cleanup: cleanup2}) => {
  modifiers.includes("self") ? el._x_ignoreSelf = true : el._x_ignore = true;
  cleanup2(() => {
    modifiers.includes("self") ? delete el._x_ignoreSelf : delete el._x_ignore;
  });
};
directive("ignore", handler);

// packages/alpinejs/src/directives/x-effect.js
directive("effect", (el, {expression}, {effect: effect3}) => effect3(evaluateLater(el, expression)));

// packages/alpinejs/src/utils/on.js
function on(el, event, modifiers, callback) {
  let listenerTarget = el;
  let handler4 = (e) => callback(e);
  let options = {};
  let wrapHandler = (callback2, wrapper) => (e) => wrapper(callback2, e);
  if (modifiers.includes("dot"))
    event = dotSyntax(event);
  if (modifiers.includes("camel"))
    event = camelCase2(event);
  if (modifiers.includes("passive"))
    options.passive = true;
  if (modifiers.includes("capture"))
    options.capture = true;
  if (modifiers.includes("window"))
    listenerTarget = window;
  if (modifiers.includes("document"))
    listenerTarget = document;
  if (modifiers.includes("debounce")) {
    let nextModifier = modifiers[modifiers.indexOf("debounce") + 1] || "invalid-wait";
    let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
    handler4 = debounce(handler4, wait);
  }
  if (modifiers.includes("throttle")) {
    let nextModifier = modifiers[modifiers.indexOf("throttle") + 1] || "invalid-wait";
    let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
    handler4 = throttle(handler4, wait);
  }
  if (modifiers.includes("prevent"))
    handler4 = wrapHandler(handler4, (next, e) => {
      e.preventDefault();
      next(e);
    });
  if (modifiers.includes("stop"))
    handler4 = wrapHandler(handler4, (next, e) => {
      e.stopPropagation();
      next(e);
    });
  if (modifiers.includes("self"))
    handler4 = wrapHandler(handler4, (next, e) => {
      e.target === el && next(e);
    });
  if (modifiers.includes("away") || modifiers.includes("outside")) {
    listenerTarget = document;
    handler4 = wrapHandler(handler4, (next, e) => {
      if (el.contains(e.target))
        return;
      if (e.target.isConnected === false)
        return;
      if (el.offsetWidth < 1 && el.offsetHeight < 1)
        return;
      if (el._x_isShown === false)
        return;
      next(e);
    });
  }
  if (modifiers.includes("once")) {
    handler4 = wrapHandler(handler4, (next, e) => {
      next(e);
      listenerTarget.removeEventListener(event, handler4, options);
    });
  }
  handler4 = wrapHandler(handler4, (next, e) => {
    if (isKeyEvent(event)) {
      if (isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers)) {
        return;
      }
    }
    next(e);
  });
  listenerTarget.addEventListener(event, handler4, options);
  return () => {
    listenerTarget.removeEventListener(event, handler4, options);
  };
}
function dotSyntax(subject) {
  return subject.replace(/-/g, ".");
}
function camelCase2(subject) {
  return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
}
function isNumeric(subject) {
  return !Array.isArray(subject) && !isNaN(subject);
}
function kebabCase2(subject) {
  if ([" ", "_"].includes(subject))
    return subject;
  return subject.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]/, "-").toLowerCase();
}
function isKeyEvent(event) {
  return ["keydown", "keyup"].includes(event);
}
function isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers) {
  let keyModifiers = modifiers.filter((i) => {
    return !["window", "document", "prevent", "stop", "once", "capture"].includes(i);
  });
  if (keyModifiers.includes("debounce")) {
    let debounceIndex = keyModifiers.indexOf("debounce");
    keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
  }
  if (keyModifiers.includes("throttle")) {
    let debounceIndex = keyModifiers.indexOf("throttle");
    keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
  }
  if (keyModifiers.length === 0)
    return false;
  if (keyModifiers.length === 1 && keyToModifiers(e.key).includes(keyModifiers[0]))
    return false;
  const systemKeyModifiers = ["ctrl", "shift", "alt", "meta", "cmd", "super"];
  const selectedSystemKeyModifiers = systemKeyModifiers.filter((modifier) => keyModifiers.includes(modifier));
  keyModifiers = keyModifiers.filter((i) => !selectedSystemKeyModifiers.includes(i));
  if (selectedSystemKeyModifiers.length > 0) {
    const activelyPressedKeyModifiers = selectedSystemKeyModifiers.filter((modifier) => {
      if (modifier === "cmd" || modifier === "super")
        modifier = "meta";
      return e[`${modifier}Key`];
    });
    if (activelyPressedKeyModifiers.length === selectedSystemKeyModifiers.length) {
      if (keyToModifiers(e.key).includes(keyModifiers[0]))
        return false;
    }
  }
  return true;
}
function keyToModifiers(key) {
  if (!key)
    return [];
  key = kebabCase2(key);
  let modifierToKeyMap = {
    ctrl: "control",
    slash: "/",
    space: " ",
    spacebar: " ",
    cmd: "meta",
    esc: "escape",
    up: "arrow-up",
    down: "arrow-down",
    left: "arrow-left",
    right: "arrow-right",
    period: ".",
    equal: "=",
    minus: "-",
    underscore: "_"
  };
  modifierToKeyMap[key] = key;
  return Object.keys(modifierToKeyMap).map((modifier) => {
    if (modifierToKeyMap[modifier] === key)
      return modifier;
  }).filter((modifier) => modifier);
}

// packages/alpinejs/src/directives/x-model.js
directive("model", (el, {modifiers, expression}, {effect: effect3, cleanup: cleanup2}) => {
  let scopeTarget = el;
  if (modifiers.includes("parent")) {
    scopeTarget = el.parentNode;
  }
  let evaluateGet = evaluateLater(scopeTarget, expression);
  let evaluateSet;
  if (typeof expression === "string") {
    evaluateSet = evaluateLater(scopeTarget, `${expression} = __placeholder`);
  } else if (typeof expression === "function" && typeof expression() === "string") {
    evaluateSet = evaluateLater(scopeTarget, `${expression()} = __placeholder`);
  } else {
    evaluateSet = () => {
    };
  }
  let getValue = () => {
    let result;
    evaluateGet((value) => result = value);
    return isGetterSetter(result) ? result.get() : result;
  };
  let setValue = (value) => {
    let result;
    evaluateGet((value2) => result = value2);
    if (isGetterSetter(result)) {
      result.set(value);
    } else {
      evaluateSet(() => {
      }, {
        scope: {__placeholder: value}
      });
    }
  };
  if (typeof expression === "string" && el.type === "radio") {
    mutateDom(() => {
      if (!el.hasAttribute("name"))
        el.setAttribute("name", expression);
    });
  }
  var event = el.tagName.toLowerCase() === "select" || ["checkbox", "radio"].includes(el.type) || modifiers.includes("lazy") ? "change" : "input";
  let removeListener = isCloning ? () => {
  } : on(el, event, modifiers, (e) => {
    setValue(getInputValue(el, modifiers, e, getValue()));
  });
  if (modifiers.includes("fill") && [null, ""].includes(getValue())) {
    el.dispatchEvent(new Event(event, {}));
  }
  if (!el._x_removeModelListeners)
    el._x_removeModelListeners = {};
  el._x_removeModelListeners["default"] = removeListener;
  cleanup2(() => el._x_removeModelListeners["default"]());
  if (el.form) {
    let removeResetListener = on(el.form, "reset", [], (e) => {
      nextTick(() => el._x_model && el._x_model.set(el.value));
    });
    cleanup2(() => removeResetListener());
  }
  el._x_model = {
    get() {
      return getValue();
    },
    set(value) {
      setValue(value);
    }
  };
  el._x_forceModelUpdate = (value) => {
    value = value === void 0 ? getValue() : value;
    if (value === void 0 && typeof expression === "string" && expression.match(/\./))
      value = "";
    window.fromModel = true;
    mutateDom(() => bind(el, "value", value));
    delete window.fromModel;
  };
  effect3(() => {
    let value = getValue();
    if (modifiers.includes("unintrusive") && document.activeElement.isSameNode(el))
      return;
    el._x_forceModelUpdate(value);
  });
});
function getInputValue(el, modifiers, event, currentValue) {
  return mutateDom(() => {
    if (event instanceof CustomEvent && event.detail !== void 0)
      return event.detail ?? event.target.value;
    else if (el.type === "checkbox") {
      if (Array.isArray(currentValue)) {
        let newValue = modifiers.includes("number") ? safeParseNumber(event.target.value) : event.target.value;
        return event.target.checked ? currentValue.concat([newValue]) : currentValue.filter((el2) => !checkedAttrLooseCompare2(el2, newValue));
      } else {
        return event.target.checked;
      }
    } else if (el.tagName.toLowerCase() === "select" && el.multiple) {
      return modifiers.includes("number") ? Array.from(event.target.selectedOptions).map((option) => {
        let rawValue = option.value || option.text;
        return safeParseNumber(rawValue);
      }) : Array.from(event.target.selectedOptions).map((option) => {
        return option.value || option.text;
      });
    } else {
      let rawValue = event.target.value;
      return modifiers.includes("number") ? safeParseNumber(rawValue) : modifiers.includes("trim") ? rawValue.trim() : rawValue;
    }
  });
}
function safeParseNumber(rawValue) {
  let number = rawValue ? parseFloat(rawValue) : null;
  return isNumeric2(number) ? number : rawValue;
}
function checkedAttrLooseCompare2(valueA, valueB) {
  return valueA == valueB;
}
function isNumeric2(subject) {
  return !Array.isArray(subject) && !isNaN(subject);
}
function isGetterSetter(value) {
  return value !== null && typeof value === "object" && typeof value.get === "function" && typeof value.set === "function";
}

// packages/alpinejs/src/directives/x-cloak.js
directive("cloak", (el) => queueMicrotask(() => mutateDom(() => el.removeAttribute(prefix("cloak")))));

// packages/alpinejs/src/directives/x-init.js
addInitSelector(() => `[${prefix("init")}]`);
directive("init", skipDuringClone((el, {expression}, {evaluate: evaluate2}) => {
  if (typeof expression === "string") {
    return !!expression.trim() && evaluate2(expression, {}, false);
  }
  return evaluate2(expression, {}, false);
}));

// packages/alpinejs/src/directives/x-text.js
directive("text", (el, {expression}, {effect: effect3, evaluateLater: evaluateLater2}) => {
  let evaluate2 = evaluateLater2(expression);
  effect3(() => {
    evaluate2((value) => {
      mutateDom(() => {
        el.textContent = value;
      });
    });
  });
});

// packages/alpinejs/src/directives/x-html.js
directive("html", (el, {expression}, {effect: effect3, evaluateLater: evaluateLater2}) => {
  let evaluate2 = evaluateLater2(expression);
  effect3(() => {
    evaluate2((value) => {
      mutateDom(() => {
        el.innerHTML = value;
        el._x_ignoreSelf = true;
        initTree(el);
        delete el._x_ignoreSelf;
      });
    });
  });
});

// packages/alpinejs/src/directives/x-bind.js
mapAttributes(startingWith(":", into(prefix("bind:"))));
var handler2 = (el, {value, modifiers, expression, original}, {effect: effect3}) => {
  if (!value) {
    let bindingProviders = {};
    injectBindingProviders(bindingProviders);
    let getBindings = evaluateLater(el, expression);
    getBindings((bindings) => {
      applyBindingsObject(el, bindings, original);
    }, {scope: bindingProviders});
    return;
  }
  if (value === "key")
    return storeKeyForXFor(el, expression);
  if (el._x_inlineBindings && el._x_inlineBindings[value] && el._x_inlineBindings[value].extract) {
    return;
  }
  let evaluate2 = evaluateLater(el, expression);
  effect3(() => evaluate2((result) => {
    if (result === void 0 && typeof expression === "string" && expression.match(/\./)) {
      result = "";
    }
    mutateDom(() => bind(el, value, result, modifiers));
  }));
};
handler2.inline = (el, {value, modifiers, expression}) => {
  if (!value)
    return;
  if (!el._x_inlineBindings)
    el._x_inlineBindings = {};
  el._x_inlineBindings[value] = {expression, extract: false};
};
directive("bind", handler2);
function storeKeyForXFor(el, expression) {
  el._x_keyExpression = expression;
}

// packages/alpinejs/src/directives/x-data.js
addRootSelector(() => `[${prefix("data")}]`);
directive("data", skipDuringClone((el, {expression}, {cleanup: cleanup2}) => {
  expression = expression === "" ? "{}" : expression;
  let magicContext = {};
  injectMagics(magicContext, el);
  let dataProviderContext = {};
  injectDataProviders(dataProviderContext, magicContext);
  let data2 = evaluate(el, expression, {scope: dataProviderContext});
  if (data2 === void 0 || data2 === true)
    data2 = {};
  injectMagics(data2, el);
  let reactiveData = reactive(data2);
  initInterceptors(reactiveData);
  let undo = addScopeToNode(el, reactiveData);
  reactiveData["init"] && evaluate(el, reactiveData["init"]);
  cleanup2(() => {
    reactiveData["destroy"] && evaluate(el, reactiveData["destroy"]);
    undo();
  });
}));

// packages/alpinejs/src/directives/x-show.js
directive("show", (el, {modifiers, expression}, {effect: effect3}) => {
  let evaluate2 = evaluateLater(el, expression);
  if (!el._x_doHide)
    el._x_doHide = () => {
      mutateDom(() => {
        el.style.setProperty("display", "none", modifiers.includes("important") ? "important" : void 0);
      });
    };
  if (!el._x_doShow)
    el._x_doShow = () => {
      mutateDom(() => {
        if (el.style.length === 1 && el.style.display === "none") {
          el.removeAttribute("style");
        } else {
          el.style.removeProperty("display");
        }
      });
    };
  let hide = () => {
    el._x_doHide();
    el._x_isShown = false;
  };
  let show = () => {
    el._x_doShow();
    el._x_isShown = true;
  };
  let clickAwayCompatibleShow = () => setTimeout(show);
  let toggle = once((value) => value ? show() : hide(), (value) => {
    if (typeof el._x_toggleAndCascadeWithTransitions === "function") {
      el._x_toggleAndCascadeWithTransitions(el, value, show, hide);
    } else {
      value ? clickAwayCompatibleShow() : hide();
    }
  });
  let oldValue;
  let firstTime = true;
  effect3(() => evaluate2((value) => {
    if (!firstTime && value === oldValue)
      return;
    if (modifiers.includes("immediate"))
      value ? clickAwayCompatibleShow() : hide();
    toggle(value);
    oldValue = value;
    firstTime = false;
  }));
});

// packages/alpinejs/src/directives/x-for.js
directive("for", (el, {expression}, {effect: effect3, cleanup: cleanup2}) => {
  let iteratorNames = parseForExpression(expression);
  let evaluateItems = evaluateLater(el, iteratorNames.items);
  let evaluateKey = evaluateLater(el, el._x_keyExpression || "index");
  el._x_prevKeys = [];
  el._x_lookup = {};
  effect3(() => loop(el, iteratorNames, evaluateItems, evaluateKey));
  cleanup2(() => {
    Object.values(el._x_lookup).forEach((el2) => el2.remove());
    delete el._x_prevKeys;
    delete el._x_lookup;
  });
});
function loop(el, iteratorNames, evaluateItems, evaluateKey) {
  let isObject2 = (i) => typeof i === "object" && !Array.isArray(i);
  let templateEl = el;
  evaluateItems((items) => {
    if (isNumeric3(items) && items >= 0) {
      items = Array.from(Array(items).keys(), (i) => i + 1);
    }
    if (items === void 0)
      items = [];
    let lookup = el._x_lookup;
    let prevKeys = el._x_prevKeys;
    let scopes = [];
    let keys = [];
    if (isObject2(items)) {
      items = Object.entries(items).map(([key, value]) => {
        let scope2 = getIterationScopeVariables(iteratorNames, value, key, items);
        evaluateKey((value2) => keys.push(value2), {scope: {index: key, ...scope2}});
        scopes.push(scope2);
      });
    } else {
      for (let i = 0; i < items.length; i++) {
        let scope2 = getIterationScopeVariables(iteratorNames, items[i], i, items);
        evaluateKey((value) => keys.push(value), {scope: {index: i, ...scope2}});
        scopes.push(scope2);
      }
    }
    let adds = [];
    let moves = [];
    let removes = [];
    let sames = [];
    for (let i = 0; i < prevKeys.length; i++) {
      let key = prevKeys[i];
      if (keys.indexOf(key) === -1)
        removes.push(key);
    }
    prevKeys = prevKeys.filter((key) => !removes.includes(key));
    let lastKey = "template";
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let prevIndex = prevKeys.indexOf(key);
      if (prevIndex === -1) {
        prevKeys.splice(i, 0, key);
        adds.push([lastKey, i]);
      } else if (prevIndex !== i) {
        let keyInSpot = prevKeys.splice(i, 1)[0];
        let keyForSpot = prevKeys.splice(prevIndex - 1, 1)[0];
        prevKeys.splice(i, 0, keyForSpot);
        prevKeys.splice(prevIndex, 0, keyInSpot);
        moves.push([keyInSpot, keyForSpot]);
      } else {
        sames.push(key);
      }
      lastKey = key;
    }
    for (let i = 0; i < removes.length; i++) {
      let key = removes[i];
      if (!!lookup[key]._x_effects) {
        lookup[key]._x_effects.forEach(dequeueJob);
      }
      lookup[key].remove();
      lookup[key] = null;
      delete lookup[key];
    }
    for (let i = 0; i < moves.length; i++) {
      let [keyInSpot, keyForSpot] = moves[i];
      let elInSpot = lookup[keyInSpot];
      let elForSpot = lookup[keyForSpot];
      let marker = document.createElement("div");
      mutateDom(() => {
        if (!elForSpot)
          warn(`x-for ":key" is undefined or invalid`, templateEl);
        elForSpot.after(marker);
        elInSpot.after(elForSpot);
        elForSpot._x_currentIfEl && elForSpot.after(elForSpot._x_currentIfEl);
        marker.before(elInSpot);
        elInSpot._x_currentIfEl && elInSpot.after(elInSpot._x_currentIfEl);
        marker.remove();
      });
      elForSpot._x_refreshXForScope(scopes[keys.indexOf(keyForSpot)]);
    }
    for (let i = 0; i < adds.length; i++) {
      let [lastKey2, index] = adds[i];
      let lastEl = lastKey2 === "template" ? templateEl : lookup[lastKey2];
      if (lastEl._x_currentIfEl)
        lastEl = lastEl._x_currentIfEl;
      let scope2 = scopes[index];
      let key = keys[index];
      let clone2 = document.importNode(templateEl.content, true).firstElementChild;
      let reactiveScope = reactive(scope2);
      addScopeToNode(clone2, reactiveScope, templateEl);
      clone2._x_refreshXForScope = (newScope) => {
        Object.entries(newScope).forEach(([key2, value]) => {
          reactiveScope[key2] = value;
        });
      };
      mutateDom(() => {
        lastEl.after(clone2);
        initTree(clone2);
      });
      if (typeof key === "object") {
        warn("x-for key cannot be an object, it must be a string or an integer", templateEl);
      }
      lookup[key] = clone2;
    }
    for (let i = 0; i < sames.length; i++) {
      lookup[sames[i]]._x_refreshXForScope(scopes[keys.indexOf(sames[i])]);
    }
    templateEl._x_prevKeys = keys;
  });
}
function parseForExpression(expression) {
  let forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
  let stripParensRE = /^\s*\(|\)\s*$/g;
  let forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
  let inMatch = expression.match(forAliasRE);
  if (!inMatch)
    return;
  let res = {};
  res.items = inMatch[2].trim();
  let item = inMatch[1].replace(stripParensRE, "").trim();
  let iteratorMatch = item.match(forIteratorRE);
  if (iteratorMatch) {
    res.item = item.replace(forIteratorRE, "").trim();
    res.index = iteratorMatch[1].trim();
    if (iteratorMatch[2]) {
      res.collection = iteratorMatch[2].trim();
    }
  } else {
    res.item = item;
  }
  return res;
}
function getIterationScopeVariables(iteratorNames, item, index, items) {
  let scopeVariables = {};
  if (/^\[.*\]$/.test(iteratorNames.item) && Array.isArray(item)) {
    let names = iteratorNames.item.replace("[", "").replace("]", "").split(",").map((i) => i.trim());
    names.forEach((name, i) => {
      scopeVariables[name] = item[i];
    });
  } else if (/^\{.*\}$/.test(iteratorNames.item) && !Array.isArray(item) && typeof item === "object") {
    let names = iteratorNames.item.replace("{", "").replace("}", "").split(",").map((i) => i.trim());
    names.forEach((name) => {
      scopeVariables[name] = item[name];
    });
  } else {
    scopeVariables[iteratorNames.item] = item;
  }
  if (iteratorNames.index)
    scopeVariables[iteratorNames.index] = index;
  if (iteratorNames.collection)
    scopeVariables[iteratorNames.collection] = items;
  return scopeVariables;
}
function isNumeric3(subject) {
  return !Array.isArray(subject) && !isNaN(subject);
}

// packages/alpinejs/src/directives/x-ref.js
function handler3() {
}
handler3.inline = (el, {expression}, {cleanup: cleanup2}) => {
  let root = closestRoot(el);
  if (!root._x_refs)
    root._x_refs = {};
  root._x_refs[expression] = el;
  cleanup2(() => delete root._x_refs[expression]);
};
directive("ref", handler3);

// packages/alpinejs/src/directives/x-if.js
directive("if", (el, {expression}, {effect: effect3, cleanup: cleanup2}) => {
  let evaluate2 = evaluateLater(el, expression);
  let show = () => {
    if (el._x_currentIfEl)
      return el._x_currentIfEl;
    let clone2 = el.content.cloneNode(true).firstElementChild;
    addScopeToNode(clone2, {}, el);
    mutateDom(() => {
      el.after(clone2);
      initTree(clone2);
    });
    el._x_currentIfEl = clone2;
    el._x_undoIf = () => {
      walk(clone2, (node) => {
        if (!!node._x_effects) {
          node._x_effects.forEach(dequeueJob);
        }
      });
      clone2.remove();
      delete el._x_currentIfEl;
    };
    return clone2;
  };
  let hide = () => {
    if (!el._x_undoIf)
      return;
    el._x_undoIf();
    delete el._x_undoIf;
  };
  effect3(() => evaluate2((value) => {
    value ? show() : hide();
  }));
  cleanup2(() => el._x_undoIf && el._x_undoIf());
});

// packages/alpinejs/src/directives/x-id.js
directive("id", (el, {expression}, {evaluate: evaluate2}) => {
  let names = evaluate2(expression);
  names.forEach((name) => setIdRoot(el, name));
});

// packages/alpinejs/src/directives/x-on.js
mapAttributes(startingWith("@", into(prefix("on:"))));
directive("on", skipDuringClone((el, {value, modifiers, expression}, {cleanup: cleanup2}) => {
  let evaluate2 = expression ? evaluateLater(el, expression) : () => {
  };
  if (el.tagName.toLowerCase() === "template") {
    if (!el._x_forwardEvents)
      el._x_forwardEvents = [];
    if (!el._x_forwardEvents.includes(value))
      el._x_forwardEvents.push(value);
  }
  let removeListener = on(el, value, modifiers, (e) => {
    evaluate2(() => {
    }, {scope: {$event: e}, params: [e]});
  });
  cleanup2(() => removeListener());
}));

// packages/alpinejs/src/directives/index.js
warnMissingPluginDirective("Collapse", "collapse", "collapse");
warnMissingPluginDirective("Intersect", "intersect", "intersect");
warnMissingPluginDirective("Focus", "trap", "focus");
warnMissingPluginDirective("Mask", "mask", "mask");
function warnMissingPluginDirective(name, directiveName2, slug) {
  directive(directiveName2, (el) => warn(`You can't use [x-${directiveName2}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
}

// packages/alpinejs/src/index.js
alpine_default.setEvaluator(normalEvaluator);
alpine_default.setReactivityEngine({reactive: reactive2, effect: effect2, release: stop, raw: toRaw});
var src_default = alpine_default;

// packages/alpinejs/builds/module.js
var module_default = src_default;


;// CONCATENATED MODULE: ./src/libs/storage.js
/**
 * 如果需要对键进行加密请自行安装模块
 * npm install md5
 */
//let md5 = require('md5');
/* harmony default export */ const storage = ({
    /**
     * 新增数据
     * @param {String} _key
     * @param {mixed} val
     * @param {Number} _expire_time
     */
    set: function (_key, val, _expire_time) {
        var time = new Date().getTime(),
            key = this.hash(_key),
            expire_time = _expire_time ? _expire_time : 0;
        if (expire_time > 0) {
            expire_time = time + expire_time * 1000;
        }
        var obj = {},
            _v = {
                val: val,
                expire_time: expire_time,
            };
        localStorage.setItem(key, JSON.stringify(_v));
    },
    /**
     * 获取数据
     * @param  {String}   key
     * @param  {Function} callback
     * @return mixed
     */
    get: function (key, callback) {
        var _this = this,
            _key = this.hash(key),
            res = localStorage.getItem(_key);
        //console.log('读取的结果：' + key + ':' + res);
        if (res) {
            res = JSON.parse(res);
            if (typeof res.val != "undefined") {
                if (typeof res.expire_time != "undefined") {
                    var time = new Date().getTime();
                    if (res.expire_time > 0 && time > res.expire_time) {
                        console.log("过期删除KEY:" + key, key);
                        _this.remove(key);
                        if (this.isCallback(callback)) {
                            callback(null);
                        }
                        return null;
                    }
                }
                if (this.isCallback(callback)) {
                    callback(res.val);
                }
                return res.val;
            }
        } else {
            if (this.isCallback(callback)) {
                callback(null);
            }
            return null;
        }
    },
    /**
     * 删除单个数据
     * @param  {String}   key
     * @param  {Function} callback
     */
    remove: function (key, callback) {
        var _key = this.hash(key);
        localStorage.removeItem(_key);
        if (this.isCallback(callback)) {
            callback();
        }
    },
    /**
     * 清除全部
     * @param  {Function} callback
     */
    clear: function (callback) {
        var len = localStorage.length; // 获取长度
        for (var i = 0; i < len; i++) {
            // 获取key 索引从0开始
            var getKey = localStorage.key(i);
            if (getKey !== "crx_api_url") {
                localStorage.removeItem(getKey);
            }
        }
        if (this.isCallback(callback)) {
            callback();
        }
    },
    hash: function (key) {
        //return md5(key);
        return key;
    },
    isCallback: function (callback) {
        return typeof callback == "function";
    },
});

;// CONCATENATED MODULE: ./src/config/index.js



/* harmony default export */ const config = ({
    'API_URL':storage.get('api_url') || 'http://127.0.0.1:8080',
    'GITHUB_URL':'https://github.com/DDZH-DEV/Find-Your-Shell',
    'VERSION':'1.0.0',
    'CLOUD_URL':storage.get('cloud_url') || 'http://127.0.0.1:8080',
    'CONTACT_URL':storage.get('contact_url') || 'http://wpa.qq.com/msgrd?v=3&uin=2401036&site=qq&menu=yes',
    'SHANG':'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABkAAD/4QMuaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA5LjAtYzAwMSA3OS5jMDIwNGIyZGVmLCAyMDIzLzAyLzAyLTEyOjE0OjI0ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpCREVFODBCNTJFMUYxMUVFOTk5RkY0QTI1NkJDNjU3NiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpCREVFODBCNDJFMUYxMUVFOTk5RkY0QTI1NkJDNjU3NiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjAyMyBXaW5kb3dzIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Q0EyMzdFMTIyQkIwMTFFRTk0RENERkJEQjQ0NTIyNkUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6Q0EyMzdFMTMyQkIwMTFFRTk0RENERkJEQjQ0NTIyNkUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7/7gAOQWRvYmUAZMAAAAAB/9sA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'
});
;// CONCATENATED MODULE: ./src/libs/util.js



/* harmony default export */ const libs_util = ({
    turn: function (str) {
        str = typeof str == "string" ? str.replace(/\\/g, '\\\\') : '';
        return str ? encodeURIComponent(str) : str;
    },

    //字符串转base64
    getEncode64(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
            }));

    },
    getDecode64(str) {
        return decodeURIComponent(atob(str).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    },
    msg: function (msg, type) {
        let _type = ["success", "error"].indexOf(type) > -1 ? type : "success";
        //console.log("消息类型：", _type, $.lightTip);

        if (!msg) return;

        return typeof $.lightTip !== "undefined"
            ? $.lightTip[_type](msg)
            : alert(msg);
    },
    modal: function (msg, type, callback) {
        let _this = this;
        new Dialog().confirm(
            "\
            <h6>" +
            msg +
            "</h6>\
        <p>" +
            type +
            "</p>",
            {
                buttons: [
                    {
                        events: function (event) {
                            if (_this.isCallback(callback)) {
                                callback();
                            }
                            event.data.dialog.remove();
                        },
                    },
                    {},
                ],
            }
        );
    },
    i18n: function (name) {
        return compatible.i18n(name);
    },
    md5: function (str) {
        return str;
    },
    randomString: function (len) {
        len = len || 32;
        var $chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
        /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
        var maxPos = $chars.length;
        var pwd = "";
        for (var i = 0; i < len; i++) {
            pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
        }
        return pwd;
    },
    parse_str: function (str) {
        let s = str.split("&"),
            arr = {};
        for (let i = 0; i < s.length; i++) {
            let d = s[i].split("=");
            arr[d[0]] = d[1];
        }
        return arr;
    },
    ajax: function (url, data, callback) {
        let _this = this,
            type = typeof data != "object" ? "get" : "post",
            server = storage.get('api_url') || config.API_URL,
            _url = url.indexOf("http") < 0 ? server + "///" + url : url;
        _url = _url.replace(/\/{3,}/gi, "/");
        callback = (typeof callback == "undefined" && typeof data == "function") ? data : callback;
        if (typeof data == "object") {
            data.t = data.token ? data.token : storage.get("token");
        }
        $.ajax({
            url: _url,
            xhrFields: {
                // withCredentials: true
            },
            // contentType: "application/json",
            data: data,
            dataType: "json",
            type: type,
            // async: false,
            success: function (response) {
                if (
                    response &&
                    typeof response.msg != "undefined" &&
                    response.msg
                ) {
                    let type =
                        response.code !== 200
                            ? "error"
                            : "success";
                    _this.msg(response.msg, type);
                    if (response.code === 403) {
                    }
                }
                if (_this.isCallback(callback)) {
                    callback(response);
                }
            },
            fail: function (res) {
                console.log(res);
                _this.msg('请求失败:' + res.statusText, 'error');
            },
            error(res) {
                console.log(res);
                _this.msg('请求失败,请确认服务器地址' + server + '是否正确', 'error');
            }
        });
    },
    isMobile: function () {
        if (
            /(iPhone|iPad|iPod|iOS|Android|BlackBerry|Windows Phone)/i.test(
                navigator.userAgent
            )
        ) {
            return true;
        }
        return false;
    },
    getBase64: function (img) {
        function getBase64Image(img, width, height) {
            //width、height调用时传入具体像素值，控制大小 ,不传则默认图像大小
            var canvas = document.createElement("canvas");
            canvas.width = width ? width : img.width;
            canvas.height = height ? height : img.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var dataURL = canvas.toDataURL();
            return dataURL;
        }

        var image = new Image();
        image.crossOrigin = "";
        image.src = img;
        var deferred = $.Deferred();
        if (img) {
            image.onload = function () {
                deferred.resolve(getBase64Image(image)); //将base64传给done上传处理
            };
            return deferred.promise(); //问题要让onload完成后再return sessionStorage['imgTest']
        }
    },
    formatDate: function (time, fmt, is_date) {
        if (is_date) {
            var date = new Date(time);
        } else {
            var _time = time.toString(),
                timeStr =
                    _time.length === 10
                        ? parseInt(_time) * 1000
                        : parseInt(_time),
                date = new Date(timeStr);
        }
        var _fmt = fmt ? fmt : "yyyy-MM-dd";
        if (/(y+)/.test(_fmt)) {
            _fmt = _fmt.replace(
                RegExp.$1,
                (date.getFullYear() + "").substr(4 - RegExp.$1.length)
            );
        }
        let o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
        };
        // 遍历这个对象
        for (let k in o) {
            if (new RegExp(`(${k})`).test(_fmt)) {
                let str = o[k] + "";
                _fmt = _fmt.replace(
                    RegExp.$1,
                    RegExp.$1.length === 1
                        ? str
                        : ("00" + str).substr(str.length)
                );
            }
        }
        //let date=new Date(fmt);
        return _fmt;
    },
    getNowTime: function () {
        return new Date().getTime();
    },
    removeItem: function (arr, val) {
        return arr.filter(function (i) {
            return i !== val;
        })
    },
    objIsEmpty: function (obj) {
        return JSON.stringify(obj) === "{}";
    },
    isObj: function (val) {
        return (
            val != null &&
            typeof val === "object" &&
            this.isArray(val) === false
        );
    },
    isArray: function (str) {
        return Object.prototype.toString.call(str) === "[object Array]";
    },
    isStr: function (str) {
        return (
            typeof str == "string" && !(this.isObj(str) || this.isArray(str))
        );
    },
    isCallback: function (callback) {
        return typeof callback == "function";
    },
    cloneObj: function (obj) {
        let str,
            newobj = obj.constructor === Array ? [] : {};
        if (typeof obj !== "object") {
            return;
        } else if (window.JSON) {
            (str = JSON.stringify(obj)), //系列化对象
                (newobj = JSON.parse(str)); //还原
        } else {
            for (let i in obj) {
                newobj[i] =
                    typeof obj[i] === "object" ? cloneObj(obj[i]) : obj[i];
            }
        }
        return newobj;
    },
    objSort: function (obj) {
        //排序的函数
        let newkey = Object.keys(obj).sort(); //先用Object内置类的keys方法获取要排序对象的属性名，再利用Array原型上的sort方法对获取的属性名进行排序，newkey是一个数组
        let newObj = {}; //创建一个新的对象，用于存放排好序的键值对
        for (let i = 0; i < newkey.length; i++) {
            //遍历newkey数组
            newObj[newkey[i]] = obj[newkey[i]]; //向新创建的对象中按照排好的顺序依次增加键值对
        }
        return newObj; //返回排好序的新对象
    },
    getUrlParams: function () {
        let res = {},
            params = window.location.href.split("?");
        params = params[1].split("&");
        for (let i in params) {
            let item = params[i].split("=");
            res[item[0]] = item[1];
        }
        return res;
    },
    /**
     *
     * @param url
     * @returns {{path: string, protocol: string, file: string | string, port: string, query: string, host: string, source, params: {}, hash: string, relative: string | string, segments: string[]}}
     */
    parseURL: function (url) {
        let a = document.createElement("a");
        a.href = url;
        return {
            source: url,
            protocol: a.protocol.replace(":", ""),
            host: a.hostname,
            port: a.port,
            query: a.search,
            params: (function () {
                let ret = {},
                    seg = a.search.replace(/^\?/, "").split("&"),
                    len = seg.length,
                    i = 0,
                    s;
                for (; i < len; i++) {
                    if (!seg[i]) {
                        continue;
                    }
                    s = seg[i].split("=");
                    ret[s[0]] = s[1];
                }
                return ret;
            })(),
            file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ""])[1],
            hash: a.hash.replace("#", ""),
            path: a.pathname.replace(/^([^\/])/, "/$1"),
            relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ""])[1],
            segments: a.pathname.replace(/^\//, "").split("/"),
        };
    },
    isUrl: function (str_url) {
        var strRegex =
            "^((https|http|ftp|rtsp|mms)?://)" +
            "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?" + //ftp的user@
            "(([0-9]{1,3}.){3}[0-9]{1,3}" + // IP形式的URL- 199.194.52.184
            "|" + // 允许IP和DOMAIN（域名）
            "([0-9a-z_!~*'()-]+.)*" + // 域名- www.
            "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]." + // 二级域名
            "[a-z]{2,6})" + // first level domain- .com or .museum
            "(:[0-9]{1,4})?" + // 端口- :80
            "((/?)|" + // a slash isn't required if there is no file name
            "(/[0-9a-zA-Z_!~*'().;?:@&=+$,%#-]+)+/?)$";
        var re = new RegExp(strRegex);
        return re.test(str_url);
    },
    formatSize: (limit) => {
        if (!limit || Number(limit) == 0) return ''
        limit = Number(limit)
        // 将size B转换成 M
        var size = ''
        if (limit < 1 * 1024) {
            //小于1KB，则转化成B
            size = limit.toFixed(2) + 'B'
        } else if (limit < 1 * 1024 * 1024) {
            //小于1MB，则转化成KB
            size = (limit / 1024).toFixed(2) + 'KB'
        } else if (limit < 1 * 1024 * 1024 * 1024) {
            //小于1GB，则转化成MB
            size = (limit / (1024 * 1024)).toFixed(2) + 'MB'
        } else {
            //其他转化成GB
            size = (limit / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
        }

        var sizeStr = size + '' //转成字符串
        var index = sizeStr.indexOf('.') //获取小数点处的索引
        var dou = sizeStr.substr(index + 1, 2) //获取小数点后两位的值
        if (dou == '00') {
            //判断后两位是否为00，如果是则删除00
            return sizeStr.substring(0, index) + sizeStr.substr(index + 3, 2)
        }
        return size
    },
    //相似度算法
    similar(s, t, f) {
        if (!s || !t) {
            return 0
        }
        var l = s.length > t.length ? s.length : t.length
        var n = s.length
        var m = t.length
        var d = []
        f = f || 3
        var min = function (a, b, c) {
            return a < b ? (a < c ? a : c) : (b < c ? b : c)
        }
        var i, j, si, tj, cost
        if (n === 0) return m
        if (m === 0) return n
        for (i = 0; i <= n; i++) {
            d[i] = []
            d[i][0] = i
        }
        for (j = 0; j <= m; j++) {
            d[0][j] = j
        }
        for (i = 1; i <= n; i++) {
            si = s.charAt(i - 1)
            for (j = 1; j <= m; j++) {
                tj = t.charAt(j - 1)
                if (si === tj) {
                    cost = 0
                } else {
                    cost = 1
                }
                d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
            }
        }
        let res = (1 - d[n][m] / l)
        return res.toFixed(f)
    }

});

;// CONCATENATED MODULE: ./src/libs/index.js




function findNext() {
    window.editor.refresh();
    var inpEle = document.getElementById("CodeMirror-search-field"), val = inpEle.value;
    // 模拟回车
    inpEle.focus();
    setTimeout(function () {
        const event = new Event("keydown");
        // 设置按键码为回车键的值
        Object.defineProperty(event, "keyCode", {value: 13});
        // 分派按键事件到目标输入框元素
        inpEle.dispatchEvent(event);
    }, 100)
}

window.findNext = findNext;


$(document).on("input propertychange", "#CodeMirror-search-field", function () {
    $("#match_rule").val($(this).val());
    findNext();
});
$(document).on("blur", "#CodeMirror-search-field", function () {
    $(".CodeMirror-sizer").css({"padding-top": "0px"});
});


/* harmony default export */ const libs = ({


    match_rule: "",
    file_index: "",

    dirs: [],
    files: [],

    show: [],
    show_type: 'shell',
    showFiles(type) {
        this.show_type = type;
        this.show = type === 'file' ? this.files : this.shells;
        this.showfiles(this.show);
    },
    inShellFiles(file) {
        return this.shell_files.length > 0 && this.shell_files.indexOf(file) !== -1 ? ' shell ' : '';
    },

    code_file: "",
    saveFile() {

        libs_util.ajax("/saveFile",
            {
                path: this.code_file,
                content: window.editor.getValue()
            });

    },
    code(file, rule, file_index) {

        try {
            file = libs_util.getDecode64(file)
            rule = libs_util.getDecode64(rule)
        } catch (e) {

        }
        console.log('code 编辑文件:', file, rule)
        this.code_file = file;
        this.file_index = file_index;
        this.rule_id = '';
        this.showRule(rule, false);
        this.match_rule = typeof rule == "undefined" || rule == "undefined" ? '' : '/' + rule + '/';
        libs_util.ajax("/code", {path: file}, (response) => {
            window.editor.setValue(response.data);
            $("#code_file").val(file);
            window.dialog = new Dialog({
                title: "代码查看",
                content: $("#editor").show(),
                width: "80%",
                onShow() {
                    setTimeout(function () {
                        $('#match_rule').trigger('click');
                        findNext();
                    }, 300)
                }
            });
        });
    },
    delFile() {
        var _this = this;
        console.log('$("[title=\'' + _this.code_file + '\']").addClass(\'color-red\')')
        new Dialog().confirm(
            "<h6>您确定要删除该文件吗？</h6>\
                <p>删除前最好先手动备份一下文件。</p>",
            {
                buttons: [
                    {
                        value: "删除",
                        events: function (event) {
                            libs_util.ajax("/delfile", {path: _this.code_file}, (response) => {
                                event.data.dialog.remove();
                                if (response.code === 200) {
                                    window.dialog.hide();

                                    $('[title="' + _this.code_file + '"]').addClass('color-red');
                                    setTimeout(function () {
                                        _this['show'].splice(_this.file_index, 1);
                                    }, 1000)
                                }
                            });
                        },
                    },
                    {},
                ],
            }
        );
    },

    files_num: "",
    shells_num: 0,
    shells: [],
    shell_files: [],
    scaning: false,
    scaning_time: 0,
    ls(scan) {
        this.shells_num = "...";
        this.scan = typeof scan == "undefined" ? '' : scan;
        $('#scan-btn,#load-file').addClass('loading');
        var _this = this;

        if (scan) {
            this.scaning = true;
            this.scaning_time = 0;
            window.scan_time = setInterval(function () {
                _this.scaning_time++;
            }, 1000)
        }

        libs_util.ajax("/files", {path: _this.path, scan: scan, filter: this.select_file_types}, (response) => {
            _this.scaning = false;
            clearInterval(window.scan_time);
            $('#scan-btn,#load-file').removeClass('loading');
            _this.files = response.data.Files ? response.data.Files : [];
            _this.shells = response.data.Shells ? response.data.Shells : [];

            _this.files_num = _this.files.length;
            _this.shells_num = _this.shells.length;

            _this.show_type = _this.shells_num > 0 ? 'shell' : 'file';
            // _this.show = _this.shells_num > 0 ? _this.shells : _this.files;
            _this.showfiles(_this.shells_num > 0 ? response.data.Shells : response.data.Files)
            if (_this.shells) {
                _this.shell_files = [];
                for (var i in _this.shells) {
                    _this.shell_files.push(_this.shells[i].File)
                }

                //console.log('shell_files', _this.shell_files);
            }
            _this.hash_ls = true;


        });
    },
    showfiles(files) {
        var html = doT.template(document.getElementById('file-list-tpl').innerHTML)(files);
        //console.log(html,files,document.getElementById('file-list-tpl').innerHTML)
        $('#show-files').html(html)
    },
    select_file_types: [".php"],
    selectFileExt(file_ext) {
        if (file_ext && this.select_file_types.indexOf('.' + file_ext) < 0) {
            this.select_file_types.push('.' + file_ext);
        } else {
            this.select_file_types = libs_util.removeItem(this.select_file_types, '.' + file_ext)
        }

        console.log(this.select_file_types)
    },
    inSelectFile(file_ext) {

        return file_ext && this.select_file_types.indexOf('.' + file_ext) > -1;

    },
    search() {
        if ($(".CodeMirror-dialog").length < 1) {
            try {
                window.editor.execCommand("findPersistent", true, $("#match_rule").val());
            } catch (e) {
            }
        }
        $(".CodeMirror-sizer").css({"padding-top": "20px"});
        $("#CodeMirror-search-field").val($('#match_rule').val());
    },


    rules: [],
    white_list: [],

    load() {
        var _this = this;

        libs_util.ajax("/dir?path=" + encodeURI(_this.path), (response) => {
            _this.dirs = response.data;
            _this.files_num = response.msg > 0 ? response.msg : 0;
        });

    },
    configs: {},
    config: {},
    editConfig(config) {
        console.log(config)
        this.config = config;
        window.cfgDialog = new Dialog({
            title: "配置编辑",
            content: $("#config").show()
        });
    },

    saveConfig() {
        var _this = this;
        libs_util.ajax("/saveConfig", this.config, (response) => {
            window.cfgDialog.hide();
            _this.loadConfig()
        });
    },
    file_types: [],
    loadConfig() {
        var _this = this;
        libs_util.ajax("/config", (response) => {
            _this.configs = response.data.Configs;

            for (var i in _this.configs) {

                if (_this.configs[i]['Value']) {

                    switch (_this.configs[i].Name) {
                        case 'file_type':
                            _this.file_types = _this.configs[i]['Value'].split('|');
                            break;
                        case 'css':
                            console.log($('#user-css'))
                            $('#user-css').remove();
                            $('head').append('<style id="user-css">' + _this.configs[i]['Value'] + '</style>');
                            break;
                        case 'js':
                            $('#user-js').remove();
                            $('head').append('<script  id="user-js">' + _this.configs[i]['Value'] + '</script>');
                            break;
                    }
                }

            }
            _this.rules = response.data.Rules || [];
            _this.white_list = response.data.Whites || [];
        });


    },

    init() {
        this.loadConfig()
        this.load();
        this.checkUpdate();
    },


    hash_ls: false,
    path: "/SITES/webshell-master/php",
    path_root: "/SITES/webshell-master/php",
    setPath(path) {
        this.path_root = this.path = path.replace("//", "/");
        this.hash_ls = false;
        this.now_show = "files";
    },
    goBackPath() {
        if (this.path === "/") {
            new LightTip().success("已经是根目录了");
            return;
        }
        var dir =
                this.path === "/"
                    ? "/"
                    : this.path.substring(0, this.path.lastIndexOf("/")),
            reg = new RegExp("%20", "g");
        dir = dir.replace(reg, " ");
        if (dir === "") {
            dir = "/";
        }
        this.path_root = this.path = dir;
        this.hash_ls = false;
    },

    white_type: 'hash',
    white_remark: '',
    white_all: false,
    getShowFiles() {
        if (!this.show || this.show.length < 1) {
            return null;
        }
        var files = [];
        for (var i in this.show) {
            files.push(this.show[i].File)
        }
        return files;

    },
    joinWhiteList() {
        var _this = this, files = this.white_all ? this.getShowFiles() : [this.code_file];

        if (!files || files.length < 1) {
            return libs_util.msg('无选定的文件', 'error');
        }
        libs_util.ajax("/joinWhiteList", {
            file: files,
            type: this.white_type,
            remark: this.white_remark
        }, (response) => {
            window.wld.hide();
            _this.ls(true);
        });
    },
    showJoinWhiteList(all) {
        this.white_all = typeof all !== "undefined" && all ? true : false;
        window.wld = new Dialog({
            title: "白名单设置",
            content: $("#join-white").show()
        });
    },
    rule_lang: 'php',
    rule_remark: '',
    rule_level: 1,
    rule_id: '',

    showRule(rule, show_dialog) {

        console.log(typeof rule, rule);
        if (typeof rule == "object") {
            this.match_rule = rule.Rule;
            this.rule_id = rule.Id;
            this.rule_lang = rule.Lang;
            this.rule_remark = rule.Remark;
            this.rule_level = rule.Level;
            $('#match_rule').val(rule.Rule);
            return;
        }
        try {
            rule = libs_util.getDecode64(rule)
        } catch (e) {

        }
        this.match_rule = rule;
        this.rule_id = "";
        typeof show_dialog !== "undefined" && show_dialog && this.showSaveRule()
        for (var i in this.rules) {
            if (this['rules'][i].Rule == rule) {
                this.match_rule = this['rules'][i].Rule;
                this.rule_id = this['rules'][i].Id;
                this.rule_lang = this['rules'][i].Lang;
                this.rule_remark = this['rules'][i].Remark;
                this.rule_level = this['rules'][i].Level;
                $('#match_rule').val(rule.Rule);
                break;
            }
        }

    },
    joinRule() {
        var _this = this;
        libs_util.ajax("/rule", {
            id: this.rule_id,
            rule: $('#rule').val(),
            lang: this.rule_lang,
            remark: this.rule_remark,
            level: this.rule_level
        }, (response) => {
            _this.loadConfig()
            window.rld.hide();
        });
    },
    showSaveRule() {
        if (!this.match_rule && !$('#match_rule').val()) {
            return libs_util.msg('请先输入规则', 'error');
        }
        this.match_rule = $('#match_rule').val();
        console.log(this.match_rule, typeof this.match_rule, 'this.match_rule')
        window.rld = new Dialog({title: "规则设置", content: $("#join-rule").show()});
    },
    searchRule() {
        if (!this.match_rule && !$('#match_rule').val()) {
            return libs_util.msg('请先输入规则', 'error');
        }
        this.match_rule = $('#match_rule').val();
        this.similarRules = [];
        var html = '';
        for (var i in this.rules) {

            if (libs_util.similar(this.rules[i].Rule, this.match_rule) > 0.2) {

                console.log(libs_util.similar(this.rules[i].Rule, this.match_rule), this.rules[i].Rule, this.match_rule);
                html += '<span class="ui-button ui-button-primary small-btn" onclick="app.showRule(app.rules[' + i + '])"><b>' + app.rules[i].Rule + '</b></span>'

            }
        }

        $('#similar-rules').html(html)
        console.log(html)
    },


    now_show: 'files',
    delData(id, table) {
        var _this = this;
        libs_util.ajax('/delData', {id: id, table: table}, function (response) {
            _this.loadConfig()
        })
    },


});

;// CONCATENATED MODULE: ./src/libs/extend.js



/* harmony default export */ const libs_extend = ({

    changeServer() {
        var server = storage.get('api_url') ? storage.get('api_url') : config.API_URL
        new Dialog({
            title: "服务器切换",
            content: '<input class="ui-input"  id="server" value="' + server + '" />',
            buttons: [{
                value: '切换',
                events: function (event) {

                    var url = $('#server').val();
                    if (util.isUrl(url)) {
                        util.msg('操作成功!');
                        storage.set('api_url', url);
                        event.data.dialog.remove();
                        setTimeout(function () {
                            window.location.reload();
                        }, 500)
                    }

                }
            }, {}]
        });
    },
    updateConfig(data){
        data.server&&storage.set('cloud_url',data.server);
    },
    checkUpdate() {
        var _this=this;
        fetch('https://raw.githubusercontent.com/DDZH-DEV/Find-Your-Shell/main/data.json')
            .then(response => response.json())
            .then(data => {
                _this.updateConfig(data)
            });
    },
    shang() {
        new Dialog({
            title: "打赏作者",
            content: '<div  id="shang"><img src="' + config.SHANG + '"/> <p class="text">软件花费的是个人业余时间，不定期更新，如果你觉得软件不错，打赏将为我提供源源不断的动力。</p></div>',
        });
    }
});
;// CONCATENATED MODULE: ./src/app.js
 
 




let app_app = {};

app_app=Object.assign(app_app,libs,config,libs_extend);

window.app = app_app;
window.util=libs_util;
window.Alpine = module_default;
module_default.start();


/******/ })()
;