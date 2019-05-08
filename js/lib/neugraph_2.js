var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');

import * as Graph from 'graphology';
import {format} from 'd3-format';
import WebGLRenderer from 'sigma/renderers/webgl';
import FA2Layout from 'graphology-layout-forceatlas2/worker';

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
const START_ICON = '▶';
const PAUSE_ICON = '❚❚';
const RESCALE_ICON = '⊙';
const ZOOM_ICON = '⊕';
const UNZOOM_ICON = '⊖';
const MUTED_COLOR = '#FBFBFB';
const NUMBER_FORMAT = format(',');


class SigmaGraph{
    /**
     * 
     * @param {*} data 
     */
    constructor(container, data){
        this.G = this.buildGraph(data)
        this.layout = new FA2Layout(this.G, {settings: this._getFA2Settings(this.G)});
        this.description = this._getGraphDescription(this.graph);
        this.highlightedNodes = new Set(),
        this.highlightedEdges = new Set();
        this.initCanvas(container);
        this.initRenderer();
        this.container = container;
    }
    
    initRenderer(){
        this.renderer = new WebGLRenderer(this.G, this.container, {
            zIndex: true
        });
        this.camera = this.renderer.getCamera();

        this.renderer.on('clickNode', (data)=> {
            let node = data.node;
            this.highlightNode(node);
        });

        this.renderer.on('clickStage', ()=> {
            this.unhighlightNode();
        });

        if (this.model.get('start_layout')){
            this.layoutButton.click();
        }
    }

    buildGraph(data){
        let graph = new Graph({type: data.directed ? 'directed': 'undirected'});
        data.nodes.forEach(function(node) {
            let key = node[0];
            let attrs = node[1];
    
            attrs.z = 1;
    
            if (!attrs.viz)
                attrs.viz = {};
    
            if (!attrs.x)
                attrs.x = _.get(attrs, 'viz.position.x', Math.random());
            if (!attrs.y)
                attrs.y = _.get(attrs, 'viz.position.y', Math.random());
    
            if (!attrs.size)
                attrs.size = _.get(attrs, 'viz.size', 2);
    
            if (!attrs.color) {
                attrs.color = 'color' in attrs.viz ? this._toRGBString(attrs.viz.color) : '#333';
                attrs.originalColor = attrs.color;
            }
    
            if (!attrs.label)
                attrs.label = key;
    
            graph.addNode(key, attrs);
        });
    
        data.edges.forEach(function(edge) {
            let source = edge[0];
            let target = edge[1];
            let attrs = edge[2];
    
            attrs.z = 1;
    
            if (!attrs.viz)
                attrs.viz = {};
    
            if (!attrs.color) {
                attrs.color = '#CCC';
                attrs.originalColor = attrs.color;
            }
    
            if (graph.hasEdge(source, target))
                graph.upgradeToMulti();
    
            graph.addEdge(source, target, attrs);
        });
        return graph;
    }

    initCanvas(container){
        let description = document.createElement('div');
        description.style.position = 'absolute';
        description.style.top = '10px';
        description.style.left = '10px';
        description.style.background = 'rgb(247, 247, 247)';
        description.style.border = '1px solid rgb(207, 207, 207)';
        description.style.padding = '5px';
        description.style.fontSize = '0.8em';
        description.style.fontStyle = 'italic';
        description.style.zIndex = '10';
        description.innerHTML = this.graph.description;
        
        container.appendChild(description);
        
        let layoutButton = document.createElement('button');
        layoutButton.style.position = 'absolute';
        layoutButton.style.bottom = '10px';
        layoutButton.style.right = '10px';
        layoutButton.textContent = START_ICON;
        layoutButton.style.zIndex = '10';
        layoutButton.style.width = '28px';
        layoutButton.style.height = '28px';
        layoutButton.style.textAlign = 'center';
        layoutButton.style.backgroundColor = '#fffffe';
        layoutButton.style.paddingTop = '3px';
        layoutButton.style.outline = '0';
        layoutButton.setAttribute('title', 'Start layout');
        
        layoutButton.onclick = function() {
            if (this.layout && this.layout.running) {
                layoutButton.textContent = START_ICON;
                layoutButton.setAttribute('title', 'Start layout');
                this.layout.stop();
            }
            else {
                layoutButton.textContent = PAUSE_ICON;
                layoutButton.setAttribute('title', 'Stop layout');
                this.layout.start();
            }
        };
        
        this.layoutButton = layoutButton;
        
        let unzoomButton = document.createElement('button');
        
        unzoomButton.style.position = 'absolute';
        unzoomButton.style.bottom = (28 + 5 + 28) + 'px';
        unzoomButton.style.right = '10px';
        unzoomButton.style.zIndex = '10';
        unzoomButton.style.width = '28px';
        unzoomButton.style.height = '28px';
        unzoomButton.style.fontSize = '24px';
        unzoomButton.style.textAlign = 'center';
        unzoomButton.style.backgroundColor = '#fffffe';
        unzoomButton.style.outline = '0';
        unzoomButton.setAttribute('title', 'Unzoom');
        
        let innerUnzoomButton = document.createElement('div');
        
        innerUnzoomButton.style.margin = '-11px';
        innerUnzoomButton.textContent = UNZOOM_ICON;
        
        unzoomButton.appendChild(innerUnzoomButton);
        
        unzoomButton.onclick = ()=> {
            let state = this.camera.getState();
        
            this.camera.animate({ratio: state.ratio * 1.5}, {duration: 150});
        };
        
        let zoomButton = document.createElement('button');
        
        zoomButton.style.position = 'absolute';
        zoomButton.style.bottom = (28 + 5 + 28 + 5 + 28) + 'px';
        zoomButton.style.right = '10px';
        zoomButton.style.zIndex = '10';
        zoomButton.style.width = '28px';
        zoomButton.style.height = '28px';
        zoomButton.style.fontSize = '24px';
        zoomButton.style.textAlign = 'center';
        zoomButton.style.backgroundColor = '#fffffe';
        zoomButton.style.outline = '0';
        zoomButton.setAttribute('title', 'Zoom');
        
        var innerZoomButton = document.createElement('div');
        
        innerZoomButton.style.margin = '-11px';
        innerZoomButton.textContent = ZOOM_ICON;
        
        zoomButton.appendChild(innerZoomButton);
        
        zoomButton.onclick = ()=> {
            let state = this.camera.getState();
            this.camera.animate({ratio: state.ratio / 1.5}, {duration: 150});
        };
        
        let rescaleButton = document.createElement('button');
        
        rescaleButton.style.position = 'absolute';
        rescaleButton.style.bottom = (28 + 5 + 28 + 5 + 28 + 5 + 28) + 'px';
        rescaleButton.style.right = '10px';
        rescaleButton.style.zIndex = '10';
        rescaleButton.style.width = '28px';
        rescaleButton.style.height = '28px';
        rescaleButton.style.fontSize = '24px';
        rescaleButton.style.textAlign = 'center';
        rescaleButton.style.backgroundColor = '#fffffe';
        rescaleButton.style.outline = '0';
        rescaleButton.setAttribute('title', 'Reset camera');
        
        let innerRescaleButton = document.createElement('div');
        
        innerRescaleButton.style.margin = '-11px';
        innerRescaleButton.textContent = RESCALE_ICON;
        
        rescaleButton.appendChild(innerRescaleButton);
        
        rescaleButton.onclick = ()=> {
            this.camera.animate({x: 0.5, y: 0.5, ratio: 1});
        };
        
        container.appendChild(layoutButton);
        container.appendChild(zoomButton);
        container.appendChild(unzoomButton);
        container.appendChild(rescaleButton);
    }

    highlightNode(h) {
        this.highlightedNodes.clear();
        this.highlightedEdges.clear();
        this.highlightedNodes.add(h);
    
        this.G.forEachNeighbor(h, (neighbor) =>{
            this.highlightedNodes.add(neighbor);
        });
    
        this.G.forEachEdge(h, (edge) => {
            this.highlightedEdges.add(edge);
        });
    
        this.G.forEachNode((node, attrs)=> {
            if (this.highlightedNodes.has(node)) {
                this.G.setNodeAttribute(node, 'color', attrs.originalColor);
                this.G.setNodeAttribute(node, 'z', 1);
            }
            else {
                this.G.setNodeAttribute(node, 'color', MUTED_COLOR);
                this.G.setNodeAttribute(node, 'z', 0);
            }
        });
    
        this.G.forEachEdge((edge, attrs)=> {
            if (this.highlightedEdges.has(edge)) {
                this.G.setEdgeAttribute(edge, 'color', attrs.originalColor);
                this.G.setEdgeAttribute(edge, 'z', 1);
            }
            else {
                this.G.setEdgeAttribute(edge, 'color', MUTED_COLOR);
                this.G.setEdgeAttribute(edge, 'z', 0);
            }
        });
    }
    
    unhighlightNode() {
        if (!this.highlightedNodes.size)
            return;
    
        this.highlightedNodes.clear();
        this.highlightedEdges.clear();
    
        this.G.forEachNode((node, attrs)=> {
            this.G.setNodeAttribute(node, 'color', attrs.originalColor);
            this.G.setNodeAttribute(node, 'z', 1);
        });
    
        this.G.forEachEdge((edge, attrs)=> {
            this.G.setEdgeAttribute(edge, 'color', attrs.originalColor);
            this.G.setEdgeAttribute(edge, 'z', 1);
        });
    }

    _toRGBString(element) {
        var a = element.a,
            r = element.r,
            g = element.g,
            b = element.b;
      
        return a ?
          ('rgba(' + r + ',' + g + ',' + b + ',' + a + ')') :
          ('rgb(' + r + ',' + g + ',' + b + ')');
    }
    
    _getGraphDescription(graph) {
        return (
            '<b>' +
            (graph.multi ? 'Multi' : 'Simple') +
            ' ' + graph.type + ' Graph' +
            '</b>' +
            '<br>' +
            NUMBER_FORMAT(graph.order) + ' nodes' +
            '<br>' +
            NUMBER_FORMAT(graph.size) + ' edges'
        );
    }
    
    _getFA2Settings(graph) {
        return {
            barnesHutOptimize: graph.order > 2000,
            strongGravityMode: true,
            gravity: 0.05,
            scalingRatio: 10,
            slowDown: 1 + Math.log(graph.order)
        };
    }      
}


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
        value : 'adsgadgdag'
    })
});


// Custom View. Renders the widget model.
var NeuGraphView = widgets.DOMWidgetView.extend({
    initialize: function(){
        this.renderSigma = this.renderSigma.bind(this);
    },

    render: function() {
        var self = this;

        var height = this.model.get('height');
        var data = this.model.get('data');
        var container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = height + 'px';
        var el = this.el;
        el.style.height = height + 'px';
        el.appendChild(container);

        this.graph = new SigmaGraph(container, data);

        this.container = container;

        this.dataChanged();
        this.model.on('change:value', this.dataChanged, this);
    },

    dataChanged: function() {
        requestAnimationFrame(this.renderSigma);
    },


    renderSigma: function() {
        this.graph.initRenderer()
    }
});





module.exports = {
    NeuGraphModel : NeuGraphModel,
    NeuGraphView : NeuGraphView
};