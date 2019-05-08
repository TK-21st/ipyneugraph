import ipywidgets as widgets
from traitlets import Unicode, Dict, Int, Bool, Set
import networkx as nx
import h5py

@widgets.register
class NeuGraph(widgets.DOMWidget):
    """
    Custom NeuGraph IPython widget.

    """    
    _view_name = Unicode('NeuGraphView').tag(sync=True)
    _model_name = Unicode('NeuGraphModel').tag(sync=True)
    _view_module = Unicode('ipyneugraph').tag(sync=True)
    _model_module = Unicode('ipyneugraph').tag(sync=True)
    _view_module_version = Unicode('^0.1.0').tag(sync=True)
    _model_module_version = Unicode('^0.1.0').tag(sync=True)
    value = Unicode('test').tag(sync=True)
    value_bf = Bool(False).tag(sync=True)

    graph_data = Dict({'nodes': [], 'edges': [], 'directed': False}).tag(sync=True)
    graph_data_changed = Bool(False).tag(sync=True)


    plotted_nodes = Set().tag(sync=True)
    io_data = Dict({'nodes': [], 'edges': [], 'directed': False}).tag(sync=True)
    io_data_changed = Bool(False).tag(sync=True)

    callback_dict = Dict({}).tag(sync=True)  # which callback to fire and options
    height = Int(500).tag(sync=True)
    start_layout = Bool(False).tag(sync=True)
    callback_fired = Bool(False).tag(sync=True)

    

    def __init__(self, graph, height=500, start_layout=False, **kwargs):
        super(NeuGraph, self).__init__(**kwargs)
        self.G = graph
        nodes = list(graph.nodes(data=True))
        edges = list(graph.edges(data=True))

        self.graph_data = {
            'nodes': nodes,
            'edges': edges,
            'directed': graph.is_directed()
        }

        self.file_i = None # input h5py file
        self.file_o = None # output h5py file

        self.height = height
        self.start_layout = start_layout
        self.observe(self.plot_IO, names='plotted_nodes')

    @staticmethod
    def from_gexf(handle, *args, **kwargs):
        g = nx.read_gexf(handle)

        return NeuGraph(g, *args, **kwargs)

    def update_gexf(self, fname):
        g = nx.read_gexf(fname)
        nodes = list(g.nodes(data=True))
        edges = list(g.edges(data=True))

        self.graph_data = {
            'nodes': nodes,
            'edges': edges,
            'directed': g.is_directed()
        }
        self.graph_data_changed = True
        return

    def fire_callback(self, callback, options):
        """Generic callback firing 
        """
        self.callback_dict = {
            callback: options
        }
        self.callback_fired = True

    def layout(self, method="grid", prop="class"):
        """ Initialize Layout
        """
        if method == 'grid':
            self.callback_dict = {
                'gridLayout': [prop]
            }
        elif method == 'force':
            self.callback = {
                'toggleForceLayout': []
            }
        self.callback_fired = True
    
    # def filter(self, prop, func):
    #     """ Filter graph 
    #     Returns reduced graph based on applying compare_func to property of each node

    #     Parameter
    #     ----------
    #     prop: string
    #         the property with which to filter values
    #     func: function
    #         a function that returns boolean output with 1 being included in subgraph, 0 being not
    #     """
    #     for (node, nodedata) in self.G:
    #         func(nodedata[prop])
    #     pass

    def test_callback(self, change):
        print("test",change)

    def load_IO(self, fname, IO='input'):
        """Load h5 Input/Output Files

        Parameter
        ---------
        fname: string
            file name to be loaded
        IO: string, optional
            whether the file is input or output
        """
        if IO == 'input':
            self.file_i = h5py.File(fname)
            self.filename_i = fname
        elif IO == 'output':
            self.file_o = h5py.File(fname)
            self.filename_o = fname
        else:
            raise NotImplementedError

    def plot_IO(self, nodes):
        print(nodes)
        if self.file_i is None:
            print('plotting', nodes)
        if self.file_o is not None:
            print('plotting', nodes)
        pass