---
'hive': patch
---

Add schema check composed SDL fields to public API

```graphql
query CheckComposedSchemas($targetRef: TargetReferenceInput!, $checkId: ID!) {
  target(reference:  $targetRef) {
    schemaCheck(id: $checkId) {
      compositeSchemaSDL # newly added
      supergraphSDL  # newly added
    }
  }
}
```
