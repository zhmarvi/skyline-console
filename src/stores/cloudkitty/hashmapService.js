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

import { action } from 'mobx';
import { get } from 'lodash';
import client from 'client';
import Base from 'stores/base';

// HashMap services (the API calls them "types") are the top level of the
// hashmap module config: /v1/rating/module_config/hashmap/types.
// Each service can own fields, mappings and thresholds.
export class CloudKittyHashMapServiceStore extends Base {
  get client() {
    return client.cloudkitty.hashmapServices;
  }

  // No `filterByApi` here: the types endpoint takes no filter params, so the
  // Name search is applied client-side by the list container.

  get mapper() {
    return (item) => ({
      ...item,
      id: item.service_id,
    });
  }

  @action
  async fetchDetail({ id }) {
    this.isLoading = true;
    const result = await this.client.show(id);
    const item = get(result, this.responseKey, result);
    this.detail = { ...item, id: item.service_id };
    this.isLoading = false;
    return this.detail;
  }

  @action
  async create(data) {
    return this.submitting(this.client.create(data));
  }
}

const globalCloudKittyHashMapServiceStore = new CloudKittyHashMapServiceStore();
export default globalCloudKittyHashMapServiceStore;
