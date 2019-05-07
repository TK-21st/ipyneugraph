var ipyneugraph = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
  id: 'ipyneugraph',
  requires: [base.IJupyterWidgetRegistry],
  activate: function(app, widgets) {
      widgets.registerWidget({
          name: 'ipyneugraph',
          version: ipyneugraph.version,
          exports: ipyneugraph
      });
  },
  autoStart: true
};

