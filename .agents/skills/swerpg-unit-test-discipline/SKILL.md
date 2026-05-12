---
name: swerpg-unit-test-discipline
description: >
  Enforce and guide unit testing discipline for the SWERPG Foundry VTT project.
  Use this skill whenever you write new tests, review test PRs, refactor existing tests,
  or when the user asks about testing patterns, assertion style, test structure, or
  how to make tests more readable. This skill codifies the project's assertion
  discipline: simple contracts, readable assertions, targeted property checks,
  explicit failure messages, and deep-compare only when the full structure is the
  contract under test.
---

# swerpg-unit-test-discipline

## Why this exists

A unit test is an executable specification. When it fails, the assertion must tell you
*what* is wrong, *what was expected*, and *what was received* — without decoding a
30-line JSON diff. This discipline keeps tests readable, debuggable, and focused on
business contracts.

## Core rule

> **Verify the simplest business contract with a readable assertion and a speaking
> failure message.**
> Compare only the property that matters. Reserve deep object comparison for when
> the full structure IS the contract under test.

## Discipline rules

### R1. Test one contract per assertion

Each `expect()` checks one logical fact. If you need 4+ expect() calls, split the test.

### R2. Extract before compare

When only a property of the result matters, extract it first:

```js
// BAD — 50-line diff on the whole object
expect(result).toEqual(expect.objectContaining({ cost: 5 }))

// GOOD — one line, one value, instant clarity
expect(result.cost).toBe(5)
```

```js
// BAD — full array diff
expect(results).toEqual([{ id: 'cool', cost: 5 }, { id: 'skulduggery', cost: 10 }])

// GOOD — extract the interesting dimension
expect(results.map(s => s.id)).toEqual(['cool', 'skulduggery'])
expect(results.map(s => s.cost)).toEqual([5, 10])
```

### R3. Assert on semantics, not serialization

Test the business meaning, not the JSON shape:

```js
// BAD — fragile, verbose
expect(result).toHaveProperty('system.rank.value', 1)

// GOOD — speaks the domain language
expect(result.getRank()).toBe(1)
```

### R4. Error assertions target the message

```js
// BAD — compares full error objects, brittle
expect(() => validate({ name: '' })).toThrow(/* 20-line error */)

// GOOD — the relevant signal is the message
expect(() => validate({ name: '' })).toThrowError(/name is required/i)
```

### R5. Prefer strict matchers

Use `toBe`, `toBeNull`, `toBeUndefined`, `toBeTrue`, `toBeFalse` over `toEqual`
when the type is part of the contract:

```js
expect(active).toBeTrue()    // tells you it's a boolean
expect(active).toBe(true)    // also ok
expect(active).toEqual(true) // ambiguous — works for '1' too with loose models
```

### R6. Use simple data

Start with minimal factory data. Override only the fields relevant to the test:

```js
// BAD — 15-line data object, reader doesn't know what's relevant
const data = {
  name: 'Cool',
  career: 'Explorer',
  rank: { min: 0, max: 5, value: 1 },
  careerFree: 0,
  specializationFree: 0,
  isSpecialized: false,
  characteristic: 'brawn',
  // ... 8 more fields
}

// GOOD — minimal, explicit override
const data = createSkillData({ careerFree: 1, value: 1 })
```

## When deep comparison IS correct

Full-object comparison is the right choice when:

| Scenario | Example |
|---|---|
| Round-trip serialization | `expect(restored).toEqual(input)` |
| Factory verification | `expect(createCharacter()).toMatchObject({ species: 'human', ... })` |
| External API contract | The full response shape is documented and stable |

In all other cases, extract and compare the property that expresses the business rule.

## Test description format

```
test('should <expected behavior> when <condition>')
```

Not `test('<condition>')` or `test('works')` — the reader must know what success
looks like from the description alone.

## Badge reference

When reviewing, use these shorthand tags:

| Tag | Meaning |
|---|---|
| `[deep-diff]` | Comparing too much — extract the value |
| `[vague-assert]` | Assertion doesn't explain what's wrong |
| `[brittle-structure]` | Testing JSON shape instead of business semantics |
| `[no-arrange]` | Missing Arrange step, hard to follow |
| `[over-mocked]` | Mocks a pure function, tests nothing real |
| `[tight-coupling]` | Test too dependent on implementation details |
