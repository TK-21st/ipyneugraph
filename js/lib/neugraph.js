/**
 * NeuGraph JS Side
 * 
 * @remarks
 * In handling callbacks, to ensure that the boolean flags indicating
 * callback status is only set sequentially after callback is completed, 
 * we rely on `Promise.resolve`. See `this.callbackFired` for an example.
 * 
 * Custom Model. Custom widgets models must at least provide default values
 * for model attributes, including
 *   - `_view_name`
 *   - `_view_module`
 *   - `_view_module_version`
 * 
 *   - `_model_name`
 *   - `_model_module`
 *   - `_model_module_version`
 *  when different from the base class.
 *  
 *  When serialiazing the entire widget state for embedding, only values that
 *  differ from the defaults will be specified.
 */

var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');
var SigmaGraph = require('./graph').SigmaGraph;
// import {
//     CommandRegistry
// } from '@phosphor/commands';

// import {
//     Message
// } from '@phosphor/messaging';

// import {
//     BoxPanel, CommandPalette, ContextMenu, DockPanel, Menu, MenuBar, Widget
// } from '@phosphor/widgets';

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


        var graph_container = document.createElement('div');
        graph_container.style.width = '50%';
        graph_container.style.height = '100%'; //height + 'px';
        graph_container.style.cssFloat = 'left';
        el.appendChild(graph_container);


        this.graph = new SigmaGraph(graph_container, graph_data);
        this.graph_container = this.graph.container;

        var figure_container = document.createElement('div');
        figure_container.style.width = '50%';
        figure_container.style.height = '100%'; //height + 'px';
        figure_container.style.cssFloat = 'right';

        el.appendChild(figure_container);
        this.figure_container = figure_container;

        this.refresh();
        this.model.on('change:graph_data_changed', this.graphDataChanged, this);
        this.model.on('change:callback_fired', this.callbackFired, this); 
        this.model.on('change:io_figure_updated', this.ioFigureUpdated, this); 
                
        this.graph.on('plotNodesIO', (nodes)=>{
            this.model.set('plotted_nodes_changed', true);
            this.model.set('plotted_nodes', Array.from(nodes));
            this.touch();
        });
    },

    ioFigureUpdated: function(){
        if (this.model.get('io_figure_updated') == false){
            return;
        }
        let callback_promise = new Promise((resolve, reject) => {
            console.log('new Data');
            let fig_bytes = this.model.get('io_figure');
            let blob = new Blob([fig_bytes.buffer], { type: "image/PNG" });
            let url = URL.createObjectURL(blob);
            // let ul = div_fig.append('ul');
            // ul.append('li').append('span').classed('add', true).html('&plus;');
            // ul.append('li').append('span').classed('up', true).html('&rarr;');
            // ul.append('li').append('span').classed('down', true).html('&rarr;');
            this.figure_container.innerHTML = "";
            let img_div = document.createElement("img");
            img_div.style['border-style'] = 'solid';
            img_div.style.display = "block";
            img_div.style.height = "auto";
            img_div.style.overflowY = "scroll";
            img_div.style.width = "100%";
            img_div.src = url;
            // this.figure_container.append('img').attr('src', url);
            this.figure_container.appendChild(img_div);

            resolve(1);
        });
        callback_promise.then(() => {
            this.model.set('io_figure_updated', false);
            this.touch();
        }).catch(() => {
            this.model.set('io_figure_updated', false);
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