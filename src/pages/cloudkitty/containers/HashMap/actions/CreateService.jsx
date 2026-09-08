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
import { ModalAction } from 'containers/Action';
import globalCloudKittyHashMapServiceStore from 'stores/cloudkitty/hashmapService';

export class CreateService extends ModalAction {
  static id = 'create-hashmap-service';

  static title = t('Create Service');

  static buttonText = t('Create Service');

  get name() {
    return t('create service');
  }

  static policy = 'rating:module_config';

  static allowed = () => Promise.resolve(true);

  get formItems() {
    return [
      {
        name: 'name',
        label: t('Name'),
        type: 'input-name',
        required: true,
        tip: t('The metric name this service maps to, e.g. instance, image.'),
      },
    ];
  }

  onSubmit = (values) => globalCloudKittyHashMapServiceStore.create(values);
}

export default inject('rootStore')(observer(CreateService));
