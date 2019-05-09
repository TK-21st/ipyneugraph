import ipywidgets as widgets
from traitlets import Unicode, Dict, Int, Bool, List, Set, Bytes
from IPython.display import display
import matplotlib
import matplotlib.pyplot as plt
import networkx as nx
import h5py
import numpy as np
import io

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
    value = Unicode("NOT FIRED").tag(sync=True)

    graph_data = Dict({'nodes': [], 'edges': [], 'directed': False}).tag(sync=True)
    graph_data_changed = Bool(False).tag(sync=True)

    plotted_nodes = Set().tag(sync=True)
    plotted_nodes_changed = Bool(False).tag(sync=True)

    io_figure = Bytes(b'').tag(sync=True)
    # io_figures = Dict({'None':''}).tag(sync=True)
    io_figure_updated = Bool(False).tag(sync=True)

    callback_dict = Dict({}).tag(sync=True)  # which callback to fire and options
    callback_fired = Bool(False).tag(sync=True)

    height = Int(500).tag(sync=True)
    start_layout = Bool(False).tag(sync=True)


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

        # we assume the entire simulation has the same time vector
        self.dt = 1 # time step for simulation, default to 1
        self.Nt = None # number of time steps
        self.time_vector = None # time vector in [sec] 

        self.height = height
        self.start_layout = start_layout

        self.observe(self.plot_IO, names='plotted_nodes_changed')

        # {
        #    node_uid: {
        #       'input': {
        #           'I': [],
        #           'g': [],
        #        },
        #       'output': {
        #           'V': [],
        #           'spike_state': []
        #        }
        #    }
        # }
        self._data_cache = {} 

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

    def load_IO(self, fname, IO='input', mode='r'):
        """Load h5 Input/Output Files

        Parameter
        ---------
        fname: string
            file name to be loaded
        IO: string, optional
            whether the file is input or output
        """
        if IO == 'output':
            self.file_o = h5py.File(fname, mode)
            self.dt = self.file_o['metadata'].attrs['dt']
            self.filename_o = fname
            for key in self.file_o.keys():
                if key == 'metadata':
                    continue
                uids = list(self.file_o[key+'/uids'][()].astype(str))
                Nt = self.file_o[key+'/data'].shape[0]
                if self.Nt is None:
                    self.Nt = Nt
                else:
                    assert self.Nt == Nt, "Time step of {} is not consistent with previously set length".format(key)
                self.time_vector = np.arange(0, Nt*self.dt, self.dt)
                for id in uids:
                    if not id in self._data_cache: 
                        self._data_cache[id] = {}
                    if not 'output' in self._data_cache[id]:
                        self._data_cache[id]['output'] = {}
                    self._data_cache[id]['output'][key] = None
        elif IO == 'input':
            self.file_i = h5py.File(fname, mode)
            self.filename_i = fname
            for key in self.file_i.keys():
                uids = list(self.file_i[key+'/uids'][()].astype(str))
                Nt = self.file_i[key+'/data'].shape[0]
                if self.Nt is None:
                    self.Nt = Nt
                else:
                    assert self.Nt == Nt, "Time step of {} is not consistent with previously set length".format(key)
                self.time_vector = np.arange(0, Nt*self.dt, self.dt)
                for id in uids:
                    if not id in self._data_cache: 
                        self._data_cache[id] = {}
                    if not 'input' in self._data_cache[id]:
                        self._data_cache[id]['input'] = {}
                    self._data_cache[id]['input'][key] = None
        else:
            raise NotImplementedError

    def plot_IO(self, changes):
        """plot IO
        """
        if self.plotted_nodes_changed == False:
            return
        self.value = 'FIRED'
        fig = plt.figure(figsize=(10,10), dpi=200)
        ax_i = fig.add_subplot(2,1,1)
        ax_i.set_title('Input',fontsize=20)
        ax_o = fig.add_subplot(2,1,2)
        ax_o.set_title('Output',fontsize=20)
        ax_o.set_xlabel('Time',fontsize=20)

        for id in self.plotted_nodes:
            # input
            try:
                input_dict = self._data_cache[id]['input']
                for var in input_dict:
                    if input_dict[var] is None:
                        idx = list(self.file_i[var+'/uids'][()].astype(str)).index(id)
                        self._data_cache[id]['input'][var] = self.file_i[var+'/data'][:,idx]
                    ax_i.plot(self.time_vector, self._data_cache[id]['input'][var], label="{}: {}".format(var, id))
            except:
                continue
        for id in self.plotted_nodes:
            # output
            try:
                output_dict = self._data_cache[id]['output']
                for var in output_dict:
                    if output_dict[var] is None:
                        idx = list(self.file_o[var+'/uids'][()].astype(str)).index(id)
                        self._data_cache[id]['output'][var] = self.file_o[var+'/data'][:,idx]
                    ax_o.plot(self.time_vector, self._data_cache[id]['output'][var], label="{}: {}".format(var, id))
            except:
                continue

        ax_i.legend(fontsize=20)
        ax_o.legend(fontsize=20)
        fig.tight_layout()

        self.plotted_nodes_changed = False
        self.io_figure = NeuGraph.fig2bytes(fig)
        self.io_figure_updated = True

    @staticmethod
    def remove_synapse(G):
        newG = nx.DiGraph()
        

    @staticmethod
    def fig2bytes(fig):
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=300)
        bytes_src = buf.getvalue()
        buf.close()
        return bytes_src
