
# APIs Response Validator

Validate the shape of an API response: required and optional fields, types, arrays of objects, and fields you didn't declare.

- **Zero dependencies**, single file, CommonJS
- **Framework-agnostic core** (`validate`), with adapters for Postman and any test runner that fails on a thrown error (Jest, Mocha, Playwright, `node:test`, ...)
- **Readable reports**: missing fields, type mismatches, and extra fields, each with the exact path.

---

## 🎥 How it works

See the validator in action, catching missing fields, type mismatches, and extra fields in real-time:

<img width="1442" alt="apis-response-validator" src="https://github.com/user-attachments/assets/b4705d7f-38ac-4fd6-9c51-bd60a3d01a5b" />


**Example Report Output:**
```text
❌ Missing fields (2):
  - data.ongoingRideDetails.rideId
  - data.communication.screenMessages[2].id
⚠️ Type mismatches (1):
  - statusCode (expected number, got string)
ℹ️ Extra fields not in schema (1):
  - data.debugInfo
```

---

## 📦 Install

```bash
npm install @omar_kader/apis-response-validator
```
> **Note:** In Postman, there is nothing to install via npm. See the [Postman Integration](#-postman-integration) section.

---

## 🚀 Quick start

```javascript
const { validate, formatReport } = require('@omar_kader/apis-response-validator');

const schema = {
  'error': 'boolean',
  'statusCode': 'number',
  'message': 'string',
  'data.customerId': 'string',
  'data.ongoingRideDetails.hasOngoingRide': 'boolean',
  'data.ongoingRideDetails.rideId': 'string|null',
  'data.communication.chat.unreadCount': 'number',
  'data.communication.screenMessages': {
    type: 'array',
    items: {
      'id': 'string',
      'title': 'string',
      'imageUrl': 'string|null?',   // optional, may be null
      'action.type': 'string'
    }
  },
  'data.promo': 'object?'           // optional
};

const body = {
  error: false,
  statusCode: 200,
  message: 'Customer dashboard fetched successfully.',
  data: {
    customerId: '67f108be083a0100847f455d',
    ongoingRideDetails: { hasOngoingRide: false, rideId: null },
    communication: { chat: { unreadCount: 0 }, screenMessages: [] }
  }
};

const result = validate(body, schema);
console.log(formatReport(result));
// ✅ All fields exist with expected types
```

**A response with problems:**
```javascript
const bad = {
  error: false,
  statusCode: '200',                                   // wrong type
  message: 'ok',
  data: {
    customerId: '67f1',
    debugInfo: {},                                     // not in schema
    ongoingRideDetails: { hasOngoingRide: false },     // rideId missing
    communication: {
      chat: { unreadCount: 0 },
      screenMessages: [
        { id: '1', title: 'Hi', action: { type: 'open' }, priority: 1 },  // priority: extra
        { id: 2, title: 'Yo', imageUrl: null, action: {} },               // id wrong type, action.type missing
        { title: 'x', action: { type: 'a' } }                             // id missing
      ]
    }
  }
};

console.log(formatReport(validate(bad, schema)));
// ❌ Missing fields (3):
//   - data.ongoingRideDetails.rideId
//   - data.communication.screenMessages[1].action.type
//   - data.communication.screenMessages[2].id
// ⚠️ Type mismatches (2):
//   - statusCode (expected number, got string)
//   - data.communication.screenMessages[1].id (expected string, got number)
// ℹ️ Extra fields not in schema (2):
//   - data.communication.screenMessages[].priority
//   - data.debugInfo
```

---

## 📖 Schema Reference

A schema is a flat object. Keys are dot paths, and values are specs.

| Spec | Meaning |
|---|---|
| `'string'`, `'number'`, `'boolean'`, `'object'`, `'array'`, `'null'` | Required field of that type |
| `'string\|number'` | Required, any one of the listed types |
| `'string?'` | Optional: may be absent, but if present it must match |
| `'string\|null?'` | Optional and nullable |
| `'any'` or `null` | Required, any value (existence only) |
| `'any?'` | Optional, any value |
| `{ type: 'array', items: {...} }` | Array where every element is validated against the `items` schema |
| `{ items: {...} }` | Same as above (`type` defaults to `'array'`) |
| `{ type: 'array?', items: {...} }` | Optional array of objects |

---

## 🏷️ Types

`typeOf` is what the response value is measured against:

| Value | Type |
|---|---|
| `"x"`, `""` | `string` |
| `1`, `1.5`, `0` | `number` (integers and floats are not distinguished) |
| `true`, `false` | `boolean` |
| `null` | `null` (its own type, not covered by `object`) |
| `{}` | `object` |
| `[]` | `array` (not covered by `object`) |

---

## 💡 Examples by Type

Each example shows the schema, a value that passes, and one that fails.

### `string`, `number`, `boolean`
```javascript
validate({ name: 'Omar' }, { name: 'string' });   // valid
validate({ name: 1 },      { name: 'string' });   // ⚠️ name (expected string, got number)
validate({ age: 30 },      { age: 'number' });    // valid
validate({ ok: false },    { ok: 'boolean' });    // valid: false still counts as existing
```

### `null`
```javascript
validate({ deletedAt: null }, { deletedAt: 'null' });   // valid
```

### `object` and `array`
```javascript
validate({ meta: {} }, { meta: 'object' });   // valid
validate({ tags: [] }, { tags: 'array' });    // valid

// arrays are not objects, and vice versa
validate({ tags: [] }, { tags: 'object' });   // ⚠️ tags (expected object, got array)
```

### Union types: `a|b`
```javascript
const schema = { rideId: 'string|null', value: 'string|number' };
validate({ rideId: null, value: 'x' }, schema);   // valid
validate({ rideId: 5,    value: 1   }, schema);   // ⚠️ rideId (expected string|null, got number)
```

### Optional fields: `?`
Absent is fine. If present, the type must match.
```javascript
validate({},           { nickname: 'string?' });   // valid: absent
validate({ nickname: 'Om' }, { nickname: 'string?' });   // valid
validate({ nickname: 1 },    { nickname: 'string?' });   // ⚠️ nickname (expected string, got number)
```
`null` is a type. To allow it on an optional field, say so:
```javascript
validate({ nickname: null }, { nickname: 'string?' });        // ⚠️ nickname (expected string, got null)
validate({ nickname: null }, { nickname: 'string|null?' });   // valid
```

### Existence only: `'any'` and `null`
```javascript
validate({ a: 0, b: null, c: [] }, { a: 'any', b: null, c: 'any' });   // valid: falsy values still exist
validate({}, { a: 'any', b: null });   // ❌ Missing fields: a, b
validate({}, { a: 'any?' });           // valid
```

### Nested objects (dot paths)
```javascript
const schema = { 'user.address.city': 'string' };
validate({ user: { address: { city: 'Giza' } } }, schema);   // valid
validate({ user: {} }, schema);                              // ❌ user.address.city

// You can also declare the parent, and the children beneath it:
validate({ user: { id: '1' } }, { 'user': 'object', 'user.id': 'string' });   // valid
```

### Arrays of objects: `items`
Every element is checked. Failures are reported with the element index.
```javascript
const schema = {
  users: { type: 'array', items: { id: 'string', name: 'string' } }
};
validate({ users: [{ id: '1', name: 'A' }, { id: 2 }] }, schema);
// ❌ Missing fields (1):
//   - users[1].name
// ⚠️ Type mismatches (1):
//   - users[1].id (expected string, got number)

// `type` can be omitted when `items` is present:
validate({ users: [{ id: '1' }] }, { users: { items: { id: 'string' } } });   // valid

// An empty array passes (there is nothing to validate):
validate({ users: [] }, { users: { items: { id: 'string' } } });   // valid

// If the value isn't an array at all, that's a type mismatch:
validate({ users: {} }, { users: { type: 'array', items: { id: 'string' } } });
// ⚠️ users (expected array, got object)
```

### Nested arrays
`items` schemas support everything above, including dot paths, optional fields, and further arrays.
```javascript
const schema = {
  orders: {
    type: 'array',
    items: {
      id: 'string',
      'customer.email': 'string',
      lines: { type: 'array', items: { sku: 'string', qty: 'number' } }
    }
  }
};
validate({ orders: [{ id: '1', customer: { email: 'a@b.c' }, lines: [{ sku: 'a', qty: 1 }, { sku: 2 }] }] }, schema);
// ❌ Missing fields (1):
//   - orders[0].lines[1].qty
// ⚠️ Type mismatches (1):
//   - orders[0].lines[1].sku (expected string, got number)
```

### Root-level array responses
Schemas are matched against an object, so wrap a top-level array:
```javascript
const body = [{ id: '1' }, { id: 2, extra: true }];
validate({ items: body }, { items: { type: 'array', items: { id: 'string' } } });
// ⚠️ Type mismatches (1):
//   - items[1].id (expected string, got number)
// ℹ️ Extra fields not in schema (1):
//   - items[].extra
```

---

## 🛠️ API

### `validate(body, schema)` → `Result`
Pure function. Never throws on validation failure.
```typescript
type Result = {
  valid: boolean;       // no missing fields and no type mismatches (extras are ignored)
  missing: string[];    // e.g. 'data.customerId', 'users[1].name'
  wrongType: string[];  // e.g. 'statusCode (expected number, got string)'
  extra: string[];      // e.g. 'data.debugInfo', 'users[].nickname'
};
```

### `formatReport(result)` → `string`
Human-readable report, as shown throughout this README.

### `assertValid(body, schema)` → `Result`
Returns the result if valid. Otherwise throws an `Error` whose message is the report and whose `err.result` is the `Result`. Use it with any test runner.
```javascript
try {
  assertValid({ a: 1 }, { a: 'string', b: 'number' });
} catch (err) {
  console.log(err.message);
  // Response validation failed
  // ❌ Missing fields (1):
  //   - b
  // ⚠️ Type mismatches (1):
  //   - a (expected string, got number)
  
  console.log(err.result.missing);   // ['b']
}
```

### `createPostmanAsserter(pm)` → `{ assertFields }`
Postman adapter. `pm` is passed in explicitly. See [Postman Integration](#-postman-integration).

---

## 🏃 Usage with Test Runners

`assertValid` throws, so it works anywhere an exception fails the test.

### Node script (Node 18+ for global `fetch`)
```javascript
const { validate, formatReport } = require('@omar_kader/apis-response-validator');

const res = await fetch('https://api.example.com/dashboard');
const result = validate(await res.json(), schema);

if (!result.valid) {
  console.error(formatReport(result));
  process.exit(1);
}
```

### Jest / Mocha / `node:test`
```javascript
const { assertValid } = require('@omar_kader/apis-response-validator');

it('returns the customer dashboard', async () => {
  const body = await (await fetch(url)).json();
  assertValid(body, schema);   // fails the test with the full report
});
```

### With Supertest
```javascript
const res = await request(app).get('/dashboard').expect(200);
assertValid(res.body, schema);
```

### Playwright
```javascript
import { test } from '@playwright/test';
import { assertValid } from '@omar_kader/apis-response-validator';

test('dashboard shape', async ({ request }) => {
  const res = await request.get('/dashboard');
  assertValid(await res.json(), schema);
});
```

---

## 📮 Postman Integration

Postman can import public npm packages in scripts with `pm.require`.

### Basic usage (Tests tab)
```javascript
const { createPostmanAsserter } = pm.require('npm:@omar_kader/apis-response-validator@1.0.0');
const { assertFields } = createPostmanAsserter(pm);

pm.test('Status code is 200', () => pm.response.to.have.status(200));

assertFields(pm.response.json(), {
  'error': 'boolean',
  'statusCode': 'number',
  'message': 'string',
  'data.customerId': 'string',
  'data.ongoingRideDetails.rideId': 'string|null',
  'data.communication.screenMessages': {
    type: 'array',
    items: { 'id': 'string', 'imageUrl': 'string|null?' }
  }
});
```
**`assertFields` behavior:**
- Prints the report to the Postman Console (*View → Show Postman Console*)
- Registers two tests: *All required fields exist* and *All fields have expected types*
- Never throws, so the rest of your script still runs
- Returns the same `Result` object as `validate`

### Custom test with `validate`
```javascript
const { validate, formatReport } = pm.require('npm:@omar_kader/apis-response-validator@1.0.0');

const result = validate(pm.response.json(), schema);

pm.test('Response shape is valid', () => {
  pm.expect(result.valid, formatReport(result)).to.be.true;
});
```

### Postman Notes
- **Pin an exact version** (`@1.0.0`). Postman doesn't support version ranges or tags. If you omit the version, the latest one is used, tracked per Postman app.
- **Newman does not support external packages.** Postman's docs list the Collection Runner, monitors, and the Postman CLI as supported, and Newman as unsupported.
- Public npm packages are importable on any plan. See [Postman's docs on external registries](https://learning.postman.com/docs/tests-and-scripts/write-scripts/packages/external-package-registries).

---

## ⚠️ Rules and Limitations

- **Existence** means the key is present (own property). `null`, `0`, `false`, `''`, and `[]` all count as existing. Inherited keys like `constructor` do not.
- **`null` is its own type.** A nullable field needs `|null`.
- **Numbers:** integers and floats are both `number`.
- **Unknown type names** never match. A typo like `'str'` is reported as `a (expected str, got string)`.
- **Keys that contain a literal `.`** are not supported, because `.` is the path separator.
- **`items` validates objects only.** An array of primitives (`['a', 'b']`) can only be checked as `'array'`. If you use `items` on one, each element is reported as `(expected object, got string)`.
- **Empty arrays pass** and validate nothing.
- **Leaf `'object'` and `'array'` values are opaque.** Their contents are neither validated nor reported as extras unless you declare child paths (or `items`).
- **Report paths:** missing and type-mismatch paths include the element index (`users[2].id`). Extra-field paths collapse indexes to `[]` and are deduplicated.
- **A non-object `body`** (`null`, a string, ...) reports every required field as missing.

---

## 📄 License

MIT [LICENSE](https://github.com/OmAr-Kader/apis-response-validator/blob/main/LICENSE)