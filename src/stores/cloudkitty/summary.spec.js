// Copyright 2024 Rackspace
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CloudKittySummaryStore } from './summary';

jest.mock('client', () => ({}));
jest.mock('stores/root', () => ({ __esModule: true, default: {} }));
jest.mock('stores/project', () => ({}));

it('reports every day of a leap year with bounded request concurrency', async () => {
  const store = new CloudKittySummaryStore();
  let active = 0;
  let maximum = 0;
  store.fetchSummaryForPeriod = jest.fn(async ({ begin, end }) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await Promise.resolve();
    active -= 1;
    const days = Math.round((end - begin + 1000) / 86400000);
    return { results: [{ type: 'compute', rate: days }] };
  });
  const report = await store.fetchReport({
    begin: new Date('2024-01-01T00:00:00Z'),
    end: new Date('2024-12-31T00:00:00Z'),
  });
  expect(store.fetchSummaryForPeriod).toHaveBeenCalledTimes(367);
  expect(maximum).toBeLessThanOrEqual(7);
  expect(report.totalCost).toBe(366);
  expect(report.timeline).toHaveLength(366);
  expect(report.timeline[365]).toMatchObject({ date: '2024-12-31', total: 1 });
  expect(report.series.reduce((total, point) => total + point.rate, 0)).toBe(
    report.totalCost
  );
  expect(store.isLoading).toBe(false);
});

it.each([
  ['2025-01-01', '2026-01-02'],
  ['2026-10-21', '2026-10-20'],
  ['invalid', '2026-10-21'],
])(
  'rejects unsupported ranges before querying the API (%s, %s)',
  async (begin, end) => {
    const store = new CloudKittySummaryStore();
    const wasLoading = store.isLoading;
    store.fetchSummaryForPeriod = jest.fn();
    await expect(
      store.fetchReport({ begin: new Date(begin), end: new Date(end) })
    ).rejects.toThrow('reporting range');
    expect(store.fetchSummaryForPeriod).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(wasLoading);
  }
);
