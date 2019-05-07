// Copyright (c) Tingkai liu
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel, DOMWidgetView, ISerializers
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

import _ from 'lodash';

import Graph from 'graphology';

export
class NeuGraphModel extends DOMWidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_name: NeuGraphModel.model_name,
      _model_module: NeuGraphModel.model_module,
      _model_module_version: NeuGraphModel.model_module_version,
      _view_name: NeuGraphModel.view_name,
      _view_module: NeuGraphModel.view_module,
      _view_module_version: NeuGraphModel.view_module_version,
      value : 'Hello World'
    };
  }

  static serializers: ISerializers = {
      ...DOMWidgetModel.serializers,
      // Add any extra serializers here
    }

  static model_name = 'NeuGraphModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'NeuGraphView';   // Set to null if no view
  static view_module = MODULE_NAME;   // Set to null if no view
  static view_module_version = MODULE_VERSION;
}


export
class NeuGraphView extends DOMWidgetView {
  render() {
    this.value_changed();
    this.model.on('change:value', this.value_changed, this);
  }

  value_changed() {
    this.el.textContent = this.model.get('value');
  }
}
