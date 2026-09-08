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
import { CloudKittyHashMapFieldStore } from 'stores/cloudkitty/hashmapField';
import { fieldActionConfigs } from '../actions/fieldActions';

export class Fields extends Base {
  init() {
    this.store = new CloudKittyHashMapFieldStore();
    this.downloadStore = new CloudKittyHashMapFieldStore();
  }

  get policy() {
    return 'rating:module_config';
  }

  get name() {
    return t('hashmap fields');
  }

  get id() {
    return this.params.id;
  }

  get hideSearch() {
    return true;
  }

  get actionConfigs() {
    return fieldActionConfigs;
  }

  // Fields are scoped to the parent hashmap service.
  updateFetchParams = (params) => {
    const { id, ...rest } = params;
    return {
      ...rest,
      service_id: id,
    };
  };

  getColumns = () => [
    {
      title: t('Field ID'),
      dataIndex: 'field_id',
    },
    {
      title: t('Name'),
      dataIndex: 'name',
    },
  ];
}

export default inject('rootStore')(observer(Fields));
