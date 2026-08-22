---
name: Mongoose map reads
description: Handling Mongoose Map fields safely in hydrated and lean query results.
---

Treat Mongoose `Map` fields read by API controllers as either a real `Map` or a plain object.

**Why:** In this project, country currency data returned from a lean query did not reliably retain `Map#get`; assuming a single runtime shape rejected otherwise valid shop data.

**How to apply:** Whenever an API serializer or validator reads a Mongoose `Map`, support both `value instanceof Map ? value.get(key) : value[key]`, especially after `.lean()`.