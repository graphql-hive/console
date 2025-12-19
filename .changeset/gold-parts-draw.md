---
'hive-console-sdk-rs': patch
---

Fixed the stack overflow error while collecting schema coordinates from the recursive input object types correctly;

Let's consider the following schema:
```graphql
input RecursiveInput {
  field: String
  nested: RecursiveInput
}
```

And you have an operation that uses this input type:
```graphql
query UserQuery($input: RecursiveInput!) {
  user(input: $input) {
    id
  }
}
```

When collecting schema coordinates from operations that use this input type, the previous implementation could enter an infinite recursion when traversing the nested `RecursiveInput` type. This would lead to a stack overflow error.

