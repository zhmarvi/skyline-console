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

import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { toJS } from 'mobx';
import { Button, Card, Col, DatePicker, Empty, Row, Spin, Table } from 'antd';
import {
  Chart,
  Interval,
  Line,
  Point,
  Tooltip,
  Legend,
  Axis,
  Coordinate,
} from 'bizcharts';
import moment from 'moment';
import globalCloudKittySummaryStore from 'stores/cloudkitty/summary';
import { cloudkittyEndpoint } from 'client/client/constants';
import NotFound from 'components/Cards/NotFound';
import checkItemPolicy from 'resources/skyline/policy';
import { formatRate } from 'resources/cloudkitty/rating';
import styles from './index.less';

const { RangePicker } = DatePicker;

// Reporting tab for the Rating panel, mirroring horizon's cloudkitty-dashboard
// project/reporting "This month" tab: a date-range cost report built on the v2
// /summary endpoint, showing cumulated cost per service type (pie + table) and
// a daily time-series breakdown (line chart).
export class Reporting extends Component {
  constructor(props) {
    super(props);
    this.store = globalCloudKittySummaryStore;
    this.state = {
      // Default to the current month, matching the dashboard's default range.
      range: [moment().startOf('month'), moment()],
    };
  }

  componentDidMount() {
    if (this.endpoint && this.allowed) {
      this.fetchReport();
    }
  }

  get endpoint() {
    return cloudkittyEndpoint();
  }

  get policy() {
    return 'summary:get_summary';
  }

  get allowed() {
    return checkItemPolicy({
      policy: this.policy,
      actionName: t('rating report'),
    });
  }

  get report() {
    return toJS(this.store.report) || {};
  }

  get repartitionColumns() {
    const { totalCost = 0 } = this.report;
    return [
      {
        title: t('Service Type'),
        dataIndex: 'type',
      },
      {
        title: t('Cost'),
        dataIndex: 'rate',
        render: (value) => formatRate(value),
      },
      {
        title: t('Percentage'),
        dataIndex: 'rate',
        key: 'percentage',
        render: (value) =>
          totalCost > 0
            ? `${(Math.round((value / totalCost) * 1000) / 10).toFixed(1)}%`
            : '-',
      },
    ];
  }

  onRangeChange = (range) => {
    this.setState({ range: range || [null, null] });
  };

  onApply = () => {
    this.fetchReport();
  };

  fetchReport = () => {
    const [start, end] = this.state.range;
    if (!start || !end) {
      return;
    }
    this.store.fetchReport({
      begin: start.toDate(),
      end: end.toDate(),
    });
  };

  renderPie() {
    const { repartition = [] } = this.report;
    if (!repartition.length) {
      return <Empty />;
    }
    return (
      <Chart
        height={320}
        data={repartition}
        autoFit
        scale={{ rate: { nice: true } }}
      >
        <Coordinate type="theta" radius={0.8} />
        <Tooltip showTitle={false} />
        <Legend position="right" />
        <Interval
          position="rate"
          adjust="stack"
          color="type"
          label={[
            'type',
            {
              content: (data) => `${data.type}: ${formatRate(data.rate)}`,
            },
          ]}
        />
      </Chart>
    );
  }

  renderTimeline() {
    const { series = [] } = this.report;
    if (!series.length) {
      return <Empty />;
    }
    return (
      <Chart
        height={320}
        data={series}
        autoFit
        scale={{
          date: { type: 'cat' },
          rate: { nice: true },
        }}
      >
        <Tooltip shared showCrosshairs />
        <Legend position="top" />
        <Axis name="rate" />
        <Line shape="smooth" position="date*rate" color="type" />
        <Point position="date*rate" color="type" size={3} shape="circle" />
      </Chart>
    );
  }

  render() {
    if (!this.endpoint) {
      return (
        <NotFound title={t('Rating')} link="/base/overview" endpointError />
      );
    }
    if (!this.allowed) {
      return <NotFound title={t('rating report')} link="/base/overview" />;
    }
    const { range } = this.state;
    const { repartition = [], totalCost = 0 } = this.report;

    return (
      <Spin spinning={this.store.isLoading}>
        <div className={styles.container}>
          <Card className={styles.panel}>
            <Row gutter={16} align="middle">
              <Col>
                <span className={styles.label}>{t('Period')}:</span>
              </Col>
              <Col>
                <RangePicker
                  allowClear={false}
                  value={range}
                  onChange={this.onRangeChange}
                  disabledDate={(current) =>
                    current && current > moment().endOf('day')
                  }
                />
              </Col>
              <Col>
                <Button type="primary" onClick={this.onApply}>
                  {t('Apply')}
                </Button>
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <span className={styles.label}>{t('Total')}:</span>{' '}
                <span className={styles.total}>{formatRate(totalCost)}</span>
              </Col>
            </Row>
          </Card>

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card
                title={t('Cost Repartition by Service Type')}
                className={styles.panel}
              >
                {this.renderPie()}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title={t('Daily Cost Breakdown')} className={styles.panel}>
                {this.renderTimeline()}
              </Card>
            </Col>
          </Row>

          <Card title={t('Cost by Service Type')} className={styles.panel}>
            {repartition.length ? (
              <Table
                rowKey="type"
                columns={this.repartitionColumns}
                dataSource={repartition}
                pagination={false}
              />
            ) : (
              <Empty />
            )}
          </Card>
        </div>
      </Spin>
    );
  }
}

export default inject('rootStore')(observer(Reporting));
