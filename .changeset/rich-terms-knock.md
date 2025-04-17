---
'hive': minor
---

Laboratory Environment Variables are now scoped to Target.

Previously, we stored environment variables as a static key in your browser's local storage. This meant that any changes to the environment variables would affect all targets' Laboratory.

Now when you use Laboratory, any changes to the environment variables will not affect the environment variables of other targets' Laboratory.

## Migration Details (TL;DR: You Won't Notice Anything!)

For an indefinite period of time we will support the following migration when you load Laboratory on any target. If this holds true:

1. Your browser's localStorage has a key for the global environment variables;
2. Your browser's localStorage does NOT have a key for scoped environment variables for the Target Laboratory being loaded;

Then we will initialize the scoped environment variables for the Target Laboratory being loaded with the global ones.

Laboratory will _never_ write to the global environment variables again, so this should give you a seamless migration to scoped environment variables for all your targets.
