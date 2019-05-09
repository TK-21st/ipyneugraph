var widgets = require('@jupyter-widgets/base');

var _ = require('lodash');
var SigmaGraph = require('./graph').SigmaGraph;
// Custom Model. Custom widgets models must at least provide default values
// for model attributes, including
//
//  - `_view_name`
//  - `_view_module`
//  - `_view_module_version`
//
//  - `_model_name`
//  - `_model_module`
//  - `_model_module_version`
//
//  when different from the base class.



// When serialiazing the entire widget state for embedding, only values that
// differ from the defaults will be specified.
var NeuGraphModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'NeuGraphModel',
        _view_name : 'NeuGraphView',
        _model_module : 'ipyneugraph',
        _view_module : 'ipyneugraph',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',
    })
});


// Custom View. Renders the widget model.
var NeuGraphView = widgets.DOMWidgetView.extend({
    initialize: function(){
        this.renderSigma = this.renderSigma.bind(this);
        window.graph = this;
    },

    render: function() {
        var self = this;
        var height = this.model.get('height');
        var graph_data = this.model.get('graph_data');

        var el = this.el;
        el.style.height = "100%";
        el.style['min-height']=  height + 'px';


        var container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%'; //height + 'px';
        el.appendChild(container);


        this.graph = new SigmaGraph(container, graph_data);
        this.container = this.graph.container;

        this.refresh();
        this.model.on('change:graph_data_changed', this.graphDataChanged, this);
        this.model.on('change:callback_fired', this.callbackFired, this); 

        this.graph.on('plotNodesIO', (nodes)=>{
            this.model.set('plotted_nodes', Array.from(nodes));
            this.model.set('plotted_nodes_changed', true);
            this.touch();
        });
    },


    graphDataChanged: function() {
        if (this.model.get('graph_data_changed') == false){
            return;
        }
        let new_G_dict = this.graph.buildGraph(this.model.get('graph_data'));
        let callback_promise = new Promise((resolve, reject)=>{
            this.graph.updateGraph(new_G_dict);
            resolve(1);
        });
        callback_promise.then(()=>{
            this.model.set('graph_data_changed', false);
            this.touch();
        }).catch(()=>{
            this.model.set('graph_data_changed', false);
            this.touch();            
        });
    },


    refresh: function() {
        requestAnimationFrame(this.renderSigma);
    },


    renderSigma: function() {
        this.graph.initRenderer();
        if (this.model.get('start_layout')){
            this.graph.layoutButton.click();
        }
    },

    callbackFired: function() {
        if (this.model.get("callback_fired") == false){
            return;
        }

        let callback_dict = this.model.get("callback_dict");
        let callback_promise = new Promise((resolve, reject)=>{
            for (var func in callback_dict){
                if (! (func in this.graph.callback_registry)){
                    continue;
                }
                let _callback = this.graph.callback_registry[func].bind(this.graph);
                _callback(...callback_dict[func]);
            }
            resolve(1);
        });
        callback_promise.then(()=>{
            this.model.set('callback_fired', false);
            this.touch();
        }).catch(()=>{
            this.model.set('callback_fired', false);
            this.touch();            
        });
    },
});



module.exports = {
    NeuGraphModel : NeuGraphModel,
    NeuGraphView : NeuGraphView
};