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

import { inject, observer } from 'mobx-react';
import Base from 'containers/List';
import { CloudKittyHashMapMappingStore } from 'stores/cloudkitty/hashmapMapping';
import { mappingTypes, formatRate } from 'resources/cloudkitty/rating';
import { mappingActionConfigs } from '../actions/mappingActions';

export class Mappings extends Base {
  init() {
    this.store = new CloudKittyHashMapMappingStore();
    this.downloadStore = new CloudKittyHashMapMappingStore();
  }

  get policy() {
    return 'rating:module_config';
  }

  get name() {
    return t('hashmap mappings');
  }

  get id() {
    return this.params.id;
  }

  get hideSearch() {
    return true;
  }

  get actionConfigs() {
    return mappingActionConfigs;
  }

  // Service-level mappings are those attached directly to the parent service.
  updateFetchParams = (params) => {
    const { id, ...rest } = params;
    return {
      ...rest,
      service_id: id,
    };
  };

  getColumns = () => [
    {
      title: t('Mapping ID'),
      dataIndex: 'mapping_id',
    },
    {
      title: t('Value'),
      dataIndex: 'value',
      render: (value) => value || t('(all)'),
    },
    {
      title: t('Type'),
      dataIndex: 'type',
      valueMap: mappingTypes,
    },
    {
      title: t('Cost'),
      dataIndex: 'cost',
      render: (value) => formatRate(value),
    },
    {
      title: t('Field'),
      dataIndex: 'field_id',
      render: (value) => value || '-',
      isHideable: true,
    },
    {
      title: t('Group'),
      dataIndex: 'group_id',
      render: (value) => value || '-',
      isHideable: true,
    },
  ];
}

export default inject('rootStore')(observer(Mappings));
