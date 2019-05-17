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

    def __init__(self, graph, height=500, **kwargs):
        """ Create new NeuGraph Widget
        Parameters
        ----------
        graph: networkx.Graph
            An ND-compatible graph object
        height: int, optional
            minimum-height of the canvas
        **kwargs:
            TODO Fill in this information
        """
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
        self.filename_i = None # input h5py filename
        self.filename_o = None # output h5py filename

        # we assume the entire simulation has the same time vector
        self.dt = 1 # time step for simulation, default to 1
        self.Nt = None # number of time steps
        self.time_vector = None # time vector in [sec] 

        self.height = height

        self.observe(self._plot_IO, names='plotted_nodes_changed')

        # _data_cache saves loaded data to avoid too much file IO
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
    def from_gexf(fname, *args, **kwargs):
        """Create new NeuGraph from gexf file path
        Parameters
        ----------
        fname: str
            filename of the gexf graph
        *args:
            TODO
        **kwargs:
            TODO
        
        Returns
        -------
        NeuGraph
            a new NeuGraph instance
        """
        g = nx.read_gexf(fname)

        return NeuGraph(g, *args, **kwargs)

    def update_gexf(self, fname):
        """Update NeuGraph graph from new gexf file path
        Parameters
        -----------
        fname: str
            filename of the new graph to be loaded
        """
        g = nx.read_gexf(fname)
        nodes = list(g.nodes(data=True))
        edges = list(g.edges(data=True))

        self.graph_data = {
            'nodes': nodes,
            'edges': edges,
            'directed': g.is_directed()
        }
        self.graph_data_changed = True

    def fire_callback(self, callback, options):
        """Generic callback firing
        Note
        ----
        Currently it only supports a single callback at 
        a time. This can be changed by appending to the 
        `callback_dict` and handling it appropriated on
        the JS side

        Parameters
        ----------
        callback: str
            The callback to be fired. Needs to be one of the 
            strings inside the JS side's SigmaGraph's 
            `callback_registry`
        options: list
            a list of options to be passed into the callback 
            TODO: rewrite callback to take dictionary as input
            to avoid having to remember the command sequence
        """
        self.callback_dict = {}
        self.callback_dict[callback]= options
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
        fname: str
            file name to be loaded
        IO: str, optional
            whether the file is input or output
        mode: str, optional
            read mode for the h5 files, defaults to 'r' which 
            only reads but does not allow writing to the file
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
                for _id in uids:
                    if not _id in self._data_cache: 
                        self._data_cache[_id] = {}
                    if not 'output' in self._data_cache[_id]:
                        self._data_cache[_id]['output'] = {}
                    self._data_cache[_id]['output'][key] = None
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
                for _id in uids:
                    if not _id in self._data_cache:
                        self._data_cache[_id] = {}
                    if not 'input' in self._data_cache[_id]:
                        self._data_cache[_id]['input'] = {}
                    self._data_cache[_id]['input'][key] = None
        else:
            raise NotImplementedError

    def _plot_IO(self, changes):
        """Traitlet callback to generate IO Plot

        Notes
        -----
        This function
        - listens: changes in `plotted_nodes_changed`
        - sets:
            1. `plotted_nodes_changed = False`
            2. `io_figure` to binary version of plot
            3. `io_figure_updated = True`


        Parameters
        ----------
        changes: dict
            traitlet callback returns changes dictionary which contains
            - new: new value for trait
            - old: old value for trait
            - owner: the owner of the trait, which is the NeuGraph widget
        """
        # Note: self.plotted_nodes_changed triggers this event, therefore
        # when we set this flag to True at the end of the call, this callback
        # will be triggered again, to prevent that we safeguard against when the 
        # value is false
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
                    ax_i.plot(self.time_vector,
                              self._data_cache[id]['input'][var],
                              label="{}: {}".format(var, id))
            except:
                # if id has not input value, we simply continue in this case
                # TODO: have more detailed exception handling
                continue
        for id in self.plotted_nodes:
            # output
            try:
                output_dict = self._data_cache[id]['output']
                for var in output_dict:
                    if output_dict[var] is None:
                        idx = list(self.file_o[var+'/uids'][()].astype(str)).index(id)
                        self._data_cache[id]['output'][var] = self.file_o[var+'/data'][:,idx]
                    ax_o.plot(self.time_vector,
                              self._data_cache[id]['output'][var],
                              label="{}: {}".format(var, id))
            except:
                # if id has not input value, we simply continue in this case
                # TODO: have more detailed exception handling
                continue

        ax_i.legend(fontsize=20)
        ax_o.legend(fontsize=20)
        fig.tight_layout()

        self.plotted_nodes_changed = False
        self.io_figure = NeuGraph.fig2bytes(fig)
        self.io_figure_updated = True

    @staticmethod
    def remove_synapse(G):
        """Remove Synapse in ND-Graph
        Return a graph that does not have synapse connected between neurons

        Parameters
        ----------
        G: networkx.Graph
            NeuroDriver-compatible graph object

        Returns
        --------
        networkx.Graph
            New Graph with connectivity only betweens neurons for
            easy visualization and analysis
        """
        newG = nx.DiGraph()

    @staticmethod
    def fig2bytes(fig):
        """Convert matplotlib.figure to binary data
        Parameters
        -----------
        fig: matplotlib.figure
            input figure object
        
        Returns
        --------
        io.ByesIO
            Binary data of the figure in PNG format
        """
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=300)
        bytes_src = buf.getvalue()
        buf.close()
        return bytes_src
