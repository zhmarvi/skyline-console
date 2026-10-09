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

import { action, observable } from 'mobx';
import { get } from 'lodash';
import client from 'client';
import Base from 'stores/base';

// The rating summary is served by CloudKitty's v2 `/v2/summary` endpoint.
// It returns aggregated cost data grouped by an arbitrary set of columns
// (e.g. `type`, `resource_id`, `project_id`). We build the project rating
// dashboard (current/last month totals, forecast, breakdown and top cost
// generators) on top of this single endpoint, mirroring the horizon
// cloudkitty-dashboard project rating panel.
export class CloudKittySummaryStore extends Base {
  @observable
  summary = {
    currentMonthTotal: 0,
    lastMonthTotal: 0,
    forecastTotal: 0,
    breakdown: [],
    topResources: [],
    currentMonthName: '',
    lastMonthName: '',
  };

  @observable
  report = {
    repartition: [],
    timeline: [],
    series: [],
    totalCost: 0,
  };

  get client() {
    return client.cloudkitty.summary;
  }

  getMonthDates(year, month) {
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    // day 0 of the next month == last day of this month
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
    return { start, end };
  }

  // CloudKitty scopes /v2/summary to the caller's project automatically for
  // non-admin contexts (see cloudkitty/api/v2/summary/summary.py), so we do
  // not send an explicit project filter here. `groupby` is a repeated query
  // param; the request layer serializes arrays with arrayFormat 'repeat',
  // which is what the API's MultiQueryParam expects.
  async fetchSummaryForPeriod({ begin, end, groupby } = {}) {
    const params = {
      begin: begin.toISOString(),
      end: end.toISOString(),
      response_format: 'object',
    };
    if (groupby) {
      params.groupby = groupby;
    }
    try {
      const result = await this.client.list(params);
      return {
        results: get(result, 'results', []),
        total: get(result, 'total', 0),
      };
    } catch (e) {
      return { results: [], total: 0 };
    }
  }

  calculateForecast(currentTotal, daysElapsed, daysInMonth) {
    if (daysElapsed <= 0) {
      return currentTotal;
    }
    return (currentTotal / daysElapsed) * daysInMonth;
  }

  @action
  async fetchSummary() {
    this.isLoading = true;
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const daysElapsed = now.getUTCDate();

    const { start: currentStart } = this.getMonthDates(year, month);
    const lastMonthDates = this.getMonthDates(year, month - 1);

    const [byType, lastMonth, topResources] = await Promise.all([
      this.fetchSummaryForPeriod({
        begin: currentStart,
        end: now,
        groupby: ['type'],
      }),
      this.fetchSummaryForPeriod({
        begin: lastMonthDates.start,
        end: lastMonthDates.end,
      }),
      this.fetchSummaryForPeriod({
        begin: currentStart,
        end: now,
        groupby: ['type', 'resource_id'],
      }),
    ]);

    const currentMonthData = byType.results || [];
    const currentMonthTotal = currentMonthData.reduce(
      (acc, cur) => acc + (cur.rate || 0),
      0
    );
    const lastMonthTotal = (lastMonth.results || []).reduce(
      (acc, cur) => acc + (cur.rate || 0),
      0
    );
    const forecastTotal = this.calculateForecast(
      currentMonthTotal,
      daysElapsed,
      daysInMonth
    );

    const breakdown = currentMonthData.map((item) => {
      const rate = item.rate || 0;
      const percentage =
        currentMonthTotal > 0
          ? Math.round((rate / currentMonthTotal) * 1000) / 10
          : 0;
      return {
        type: item.type || 'Unknown',
        rate,
        percentage,
      };
    });

    const topResourcesData = [...(topResources.results || [])]
      .sort((a, b) => (b.rate || 0) - (a.rate || 0))
      .slice(0, 10);

    const monthNameOptions = { year: 'numeric', month: 'long' };
    const summary = {
      currentMonthTotal,
      lastMonthTotal,
      forecastTotal,
      breakdown,
      topResources: topResourcesData,
      currentMonthName: now.toLocaleDateString(undefined, monthNameOptions),
      lastMonthName: lastMonthDates.start.toLocaleDateString(
        undefined,
        monthNameOptions
      ),
      daysElapsed,
      daysInMonth,
    };
    this.summary = summary;
    this.isLoading = false;
    return summary;
  }

  // Build a date-range cost report, mirroring horizon's cloudkitty-dashboard
  // project/reporting _build_reporting_data: one grouped-by-type call for the
  // cumulated totals (pie chart) plus one call per day in the range for the
  // time-series breakdown. All queries hit the same v2 /summary endpoint and
  // rely on CloudKitty's automatic project scoping for non-admin contexts.
  @action
  async fetchReport({ begin, end } = {}) {
    this.isLoading = true;
    try {
      const startDay = this.startOfUTCDay(begin);
      const endExclusive = this.endOfUTCDay(end);

      // Cumulated totals by type across the whole range.
      const cumulative = await this.fetchSummaryForPeriod({
        begin: startDay,
        end: endExclusive,
        groupby: ['type'],
      });

      const byType = {};
      (cumulative.results || []).forEach((item) => {
        const type = item.type || 'Unknown';
        byType[type] = (byType[type] || 0) + (item.rate || 0);
      });

      const repartition = Object.keys(byType)
        .map((type) => ({ type, rate: byType[type] }))
        .sort((a, b) => b.rate - a.rate);

      // Per-day breakdown for the time series. Cap the number of days so an
      // over-wide range cannot fan out into an unbounded number of requests.
      const days = this.enumerateUTCDays(startDay, end, 92);
      const dayResults = await Promise.all(
        days.map((day) =>
          this.fetchSummaryForPeriod({
            begin: this.startOfUTCDay(day),
            end: this.endOfUTCDay(day),
            groupby: ['type'],
          })
        )
      );

      const timeline = days.map((day, i) => {
        const perType = {};
        (dayResults[i].results || []).forEach((item) => {
          const type = item.type || 'Unknown';
          perType[type] = (perType[type] || 0) + (item.rate || 0);
        });
        return {
          date: this.formatUTCDate(day),
          total: Object.values(perType).reduce((acc, v) => acc + v, 0),
          perType,
        };
      });

      // Flatten the timeline into { date, type, rate } rows for a grouped line
      // chart, ensuring every type has a point on every day (0 when absent).
      const types = repartition.map((r) => r.type);
      const series = [];
      timeline.forEach((point) => {
        types.forEach((type) => {
          series.push({
            date: point.date,
            type,
            rate: point.perType[type] || 0,
          });
        });
      });

      const totalCost = repartition.reduce((acc, r) => acc + r.rate, 0);

      this.report = { repartition, timeline, series, totalCost };
      return this.report;
    } finally {
      this.isLoading = false;
    }
  }

  startOfUTCDay(d) {
    const date = new Date(d);
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0
      )
    );
  }

  endOfUTCDay(d) {
    const date = new Date(d);
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59
      )
    );
  }

  enumerateUTCDays(begin, end, maxDays) {
    const days = [];
    let current = this.startOfUTCDay(begin);
    const last = this.startOfUTCDay(end);
    while (current <= last && days.length < maxDays) {
      days.push(new Date(current));
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    return days;
  }

  formatUTCDate(d) {
    const date = new Date(d);
    const y = date.getUTCFullYear();
    const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

const globalCloudKittySummaryStore = new CloudKittySummaryStore();
export default globalCloudKittySummaryStore;
