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

import Base from '../client/base';
import { cloudkittyBase, cloudkittyEndpoint } from '../client/constants';

// CloudKitty (the OpenStack "rating" service) exposes two API versions:
//  - v1: rating modules, the hashmap module config (services, fields,
//    mappings, groups, thresholds), the pyscripts module config, and the
//    generic info endpoints.
//  - v2: the rating summary endpoint used by the project dashboard.
// The keystone catalog entry points at the un-versioned base URL, so every
// resource key below is prefixed with its version.
export class CloudKittyClient extends Base {
  get baseUrl() {
    return cloudkittyBase();
  }

  get enable() {
    return !!cloudkittyEndpoint();
  }

  get resources() {
    return [
      // --- Rating modules (enable/disable, priority) ---
      {
        name: 'modules',
        key: 'v1/rating/modules',
        responseKey: 'module',
      },
      // --- Rating summary (v2) ---
      {
        name: 'summary',
        key: 'v2/summary',
        responseKey: 'summary',
      },
      // --- Generic info endpoints (config, metrics) ---
      // `infoConfig.list()` -> GET /v1/info/config
      {
        name: 'infoConfig',
        key: 'v1/info/config',
        responseKey: 'config',
      },
      // `infoMetrics.list()` -> GET /v1/info/metrics
      // `infoMetrics.show(name)` -> GET /v1/info/metrics/{name}
      {
        name: 'infoMetrics',
        key: 'v1/info/metrics',
        responseKey: 'metric',
      },
      // --- HashMap module config ---
      {
        name: 'hashmapServices',
        key: 'v1/rating/module_config/hashmap/types',
        responseKey: 'service',
      },
      {
        name: 'hashmapFields',
        key: 'v1/rating/module_config/hashmap/fields',
        responseKey: 'field',
      },
      {
        name: 'hashmapMappings',
        key: 'v1/rating/module_config/hashmap/mappings',
        responseKey: 'mapping',
      },
      {
        name: 'hashmapGroups',
        key: 'v1/rating/module_config/hashmap/groups',
        responseKey: 'group',
      },
      {
        name: 'hashmapThresholds',
        key: 'v1/rating/module_config/hashmap/thresholds',
        responseKey: 'threshold',
      },
      // --- PyScripts module config ---
      {
        name: 'pyscripts',
        key: 'v1/rating/module_config/pyscripts/scripts',
        responseKey: 'script',
      },
    ];
  }
}

const cloudkittyClient = new CloudKittyClient();
export default cloudkittyClient;
