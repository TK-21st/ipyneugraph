var Graph = require('graphology');
var WebGLRenderer =  require('sigma/renderers/webgl').default;
import { animateNodes } from  'sigma/animate';
var FA2Layout =  require('graphology-layout-forceatlas2/worker');
var format =  require('d3-format').format;
var chroma = require('chroma-js');

const START_ICON = '▶';
const PAUSE_ICON = '❚❚';
const RESCALE_ICON = '⊙';
const ZOOM_ICON = '⊕';
const UNZOOM_ICON = '⊖';
const MUTED_COLOR = '#FBFBFB';
const NUMBER_FORMAT = format(',');

export class SigmaGraph{
    constructor(container, data, options={}){
        this.container = container;
        let _graph_dict = this.buildGraph(data)
        this.G = _graph_dict.graph;
        this._nodeAttrs = _graph_dict.nodeAttrs;
        this._edgeAttrs = _graph_dict.edgeAttrs;

        this.layout = new FA2Layout(this.G, {
            settings: this._getFA2Settings(this.G)
        });
        this.description = this._getGraphDescription(this.G);
        this.highlightedNodes = new Set(),
        this.highlightedEdges = new Set();
        this.initCanvas();

        // this._dragging = false;
        // this._draggedNode = undefined;
    }

    /**
     * Update graph
     * @param {object} G_dict
     */
    updateGraph(G_dict){
        if (G_dict.graph == this.G){
            return;
        }
        delete this.G;

        this.G = G_dict.graph;
        this._nodeAttrs = G_dict.nodeAttrs;
        this._edgeAttrs = G_dict.edgeAttrs;

        this.renderer.kill();
        this.layout.kill();
        delete this.layout;
        this.layout = new FA2Layout(this.G, {
            settings: this._getFA2Settings(this.G)
        });
        this.initCanvas();
        this.initRenderer();
    }
    
    /**
     * show node attributes in dat.gui 'Node Attributes' folder
     * @param {json} attrs 
     */
    showAttrs(node, attrs){
        let txt = '<b>' + node + '</b>';
        for (let key in attrs){
            let value = attrs[key];
            if (isNaN(value)){
                continue;
            }
            txt += '<br>' + key + ': ' + value;
        }
        this.descriptionPanel.innerHTML = txt;
    }

    /**
     * clear everything
     */
    clear(){
        let G_dict = {
            graph: new Graph(),
            nodeAttrs: {},
            edgeAttrs: {}
        }
        this.updateGraph(G_dict);
    }
    /**
     * Initialize WebGL renderer
     */
    initRenderer(){
        this.renderer = new WebGLRenderer(this.G, this.container, {
            zIndex: true
        });
        this.camera = this.renderer.getCamera();

        this.renderer.on('clickNode', (data)=> {
            let node = data.node;
            this.highlightNode(node);
            this.showAttrs(data.node, this.G.getNodeAttributes(data.node));
        });


        this.renderer.on('clickStage', ()=> {
            this.unhighlightNode();
        });

        // this.renderer.on('downNode', e => {
        //     console.log('DOWN');
        //     this._dragging = true;
        //     this._draggedNode = e.node;
        //     this.camera.disable();
        //   });

        // const captor = this.renderer.getMouseCaptor();
        // captor.on('mouseup', e => {
        //     console.log('UP');
        //     this._dragging = false;
        //     this._draggedNode = undefined;
        //     this.camera.enable();
        //   });
          
        // captor.on('mousemove', e => {
        //     console.log('MOVE');
        //     if (!this._dragging)
        //         return;

        //     // Get new position of node
        //     const pos = renderer.normalizationFunction.inverse(
        //         this.camera.viewportToGraph(renderer, e.x, e.y)
        //     );

        //     graph.setNodeAttribute(this._draggedNode, 'x', pos.x);
        //     graph.setNodeAttribute(this._draggedNode, 'y', pos.y);
        // });
          
    }

    
    /**
     * contruct graph from data
     * @param {object} data {'nodes':[ ],'edges':[ ],directed:bool}
     */
    buildGraph(data){
        let graph = new Graph({type: data.directed ? 'directed': 'undirected'});
        let nodeAttrs = undefined;
        let edgeAttrs = undefined;
        data.nodes.forEach((node)=> {
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
            // update nodes properties
            for (var prop in attrs){
                let prop_val = attrs[prop]
                if (nodeAttrs == undefined){
                    nodeAttrs = {};
                    nodeAttrs[prop] = {}
                    nodeAttrs[prop][prop_val] = [key];
                }else if (!(prop in nodeAttrs)){
                    nodeAttrs[prop] = {}
                    nodeAttrs[prop][prop_val] = [key];
                }else if (!(prop_val in nodeAttrs[prop])){
                    nodeAttrs[prop][prop_val] = [key];
                }else{
                    nodeAttrs[prop][prop_val].push(key);
                }
            }
        });
    
        data.edges.forEach((edge) => {
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
    
            if (graph.hasEdge(source, target)){
                graph.upgradeToMulti();
            }

            graph.addEdge(source, target, attrs);

            // update edges properties
            for (var prop in attrs){
                let prop_val = attrs[prop]
                if (edgeAttrs == undefined){
                    edgeAttrs = {};
                    edgeAttrs[prop] = {}
                    edgeAttrs[prop][prop_val] = [[source, target]];
                }else if (!(prop in edgeAttrs)){
                    edgeAttrs[prop] = {}
                    edgeAttrs[prop][prop_val] = [[source, target]];
                }else if (!(prop_val in edgeAttrs[prop])){
                    edgeAttrs[prop][prop_val] = [[source, target]];
                }else{
                    edgeAttrs[prop][prop_val].push([source, target]);
                }
            }
        });
        return {
            graph: graph,
            nodeAttrs: nodeAttrs,
            edgeAttrs: edgeAttrs,
        };
    }

    /**
     * Intialize canvas
     */
    initCanvas(){
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
        description.innerHTML = this.description;
        this.descriptionPanel = description;
        
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
        
        layoutButton.onclick = ()=> {
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

        this.container.appendChild(description);
        this.container.appendChild(layoutButton);
        this.container.appendChild(zoomButton);
        this.container.appendChild(unzoomButton);
        this.container.appendChild(rescaleButton);
    }

    /**
     * Show nodes in a grid
     */
    gridLayout(NRows=undefined, prop="label", order="ascend", chroma_scale="OrRd") {
        let totWidth = 100;
        let totHeight = 100;

        let NCols = null;
        if (NRows == undefined){
            NRows = Math.floor(Math.sqrt(this.G.order));
            NCols = Math.ceil(Math.sqrt(this.G.order));
        }else{
            NRows = Math.floor(NRows);
            NCols = Math.ceil(this.G.order/NRows);
        }
        let orderedNodes = this._sortNodes(prop, order);
        this.colorNodes(prop,chroma_scale);

        let new_positions = {};
        let col_res = totWidth/NCols;
        let row_res = totHeight/NRows;

        orderedNodes.forEach((node, i)=>{
            let col = i % NCols;
            let row = Math.floor(i/NCols);
            new_positions[node] = {
                x: col*col_res,
                y: row*row_res,
            }
            // this.G.setNodeAttribute(node, "x", col*col_res);
            // this.G.setNodeAttribute(node, "y", row*row_res);
        });

        animateNodes(this.G, new_positions, {duration: 2000});
    }

    /**
     * Highlight node 
     * @param {node} h 
     */
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
    
    /**
     * unhighlight all nodes 
     */
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

    /**
     * Sort the nodes in graph based on key and order.
     * 
     * Note: the sorting is done _in place_.
     * @param {String} [prop="label"]
     * @param {String} [order="ascend"]
     */
    _sortNodes(prop="label", order="ascend"){
        var self = this;
        function compare(a,b){
            let a_attr = self.G.getNodeAttribute(a, prop);
            let b_attr = self.G.getNodeAttribute(b, prop);
            if (order === "ascend"){
                if (a_attr > b_attr){
                    return 1;
                }else if (b_attr > a_attr){
                    return -1;
                }else{
                    if (self.G.getNodeAttribute(a, "label")> self.G.getNodeAttribute(b, "label")){
                        return 1;
                    }else if (self.G.getNodeAttribute(a, "label")< self.G.getNodeAttribute(b, "label")){
                        return -1
                    }else{
                        return 0;
                    }
                }
            }else{
                if (a_attr > b_attr){
                    return -1;
                }else if (b_attr > a_attr){
                    return 1;
                }else{
                    if (self.G.getNodeAttribute(a, "label")> self.G.getNodeAttribute(b, "label")){
                        return -1;
                    }else if (self.G.getNodeAttribute(a, "label")< self.G.getNodeAttribute(b, "label")){
                        return 1
                    }else{
                        return 0;
                    }
                }
            }
        }
        let allNodes = this.G.nodes();
        allNodes.sort(compare);
        return allNodes;
    }

    /**
     * Color the nodes in based on key
     * 
     * @param {String} [prop="label"]
     */
    colorNodes(prop="label", chroma_scale="OrRd"){
        var all_prop_vals = Object.keys(this._nodeAttrs[prop]);
        let all_colors = chroma.scale(chroma_scale).colors(all_prop_vals.length);

        this.G.forEachNode((idx, node) => {
            node.color = "#000";
            node.originalColor = "#000";
        })
        for (var prop_val in this._nodeAttrs[prop]){
            this._nodeAttrs[prop][prop_val].forEach((node)=>{
                let color_idx = all_prop_vals.indexOf(prop_val);
                let color = all_colors[color_idx];

                this.G.setNodeAttribute(node, "color", color);
                this.G.setNodeAttribute(node, "originalColor", color);
            })
        }
    }
}
