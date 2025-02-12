---
'hive': minor
---

Laboratory Preflight now validates your script with TypeScript. Also, the `WebWorker` runtime types are applied giving you confidence about what globals are available to you in your script.

## Backwards Incompatible Notes

This change is backwards incompatible in the sense that invalid or problematic Script code which would have previously not statically errored will now. However at this time we do not prevent script saving because of static type errors. Therefore your workflow should only at worst be visually impacted.

## About WebWorker Runtime & Types

To learn more about what the WebWorker runtime and types are, you can review the following:

1. https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
2. https://www.typescriptlang.org/tsconfig/#lib (see "WebWorker")


## Leveraging TypeScript in JavaScript

If you are not familiar with TypeScript, here is a tip for you if you find yourself with a TypeScript error that you cannot or do not want to fix. You can silence them by using comments:

```js
let a = 1;
let b = '';
// @ts-ignore
a = b;
// @ts-expect-error
a = b;
```

The advantage of `@ts-expect-error` is that if there is no error to ignore, then the comment itself becomes an error whereas `@ts-ignore` sits there quietly whether it has effect or not.

There is more you can do with TypeScript in JavaScript, such as providing type annotations via JSDoc. Learn more about it all here:

https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html
