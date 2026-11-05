import { evaluationBlockOf } from '../evaluation-block';

const since = '2026-10-29T10:00:00.000Z';

describe('evaluationBlockOf', () => {
  test('null when the rule evaluates normally', () => {
    expect(
      evaluationBlockOf({
        evaluationBlockedReason: null,
        evaluationBlockedSince: null,
        evaluationBlockedDetails: null,
      }),
    ).toBeNull();
  });

  test('maps the evaluator reason to the enum and names the unknown subgraph', () => {
    expect(
      evaluationBlockOf({
        evaluationBlockedReason: 'unknown-subgraph',
        evaluationBlockedSince: since,
        evaluationBlockedDetails: ['orders'],
      }),
    ).toEqual({
      reason: 'UNKNOWN_SUBGRAPH',
      since,
      message:
        'The filter\'s subgraph "orders" is not in the latest schema version. Update the saved filter, or publish the subgraph again.',
    });
  });

  test('pluralises for several unknown subgraphs', () => {
    expect(
      evaluationBlockOf({
        evaluationBlockedReason: 'unknown-subgraph',
        evaluationBlockedSince: since,
        evaluationBlockedDetails: ['orders', 'inventory'],
      })?.message,
    ).toContain('subgraphs "orders", "inventory" are not');
  });

  test('scope-too-large carries the count and the budget', () => {
    const block = evaluationBlockOf({
      evaluationBlockedReason: 'scope-too-large',
      evaluationBlockedSince: since,
      evaluationBlockedDetails: ['3412'],
    });
    expect(block?.reason).toBe('SCOPE_TOO_LARGE');
    expect(block?.message).toContain('own 3412 fields, more than the 3000');
  });

  test('a reason this build does not know reads as not blocked', () => {
    expect(
      evaluationBlockOf({
        evaluationBlockedReason: 'something-new',
        evaluationBlockedSince: since,
        evaluationBlockedDetails: null,
      }),
    ).toBeNull();
  });
});
