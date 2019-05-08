import ipywidgets as widgets
from traitlets import Unicode, Dict, Int, Bool
import networkx as nx

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

    data = Dict({'nodes': [], 'edges': [], 'directed': False}).tag(sync=True)
    height = Int(500).tag(sync=True)
    start_layout = Bool(False).tag(sync=True)
    data_changed = Bool(False).tag(sync=True)

    def __init__(self, graph, height=500, start_layout=False, **kwargs):
        super(NeuGraph, self).__init__(**kwargs)
        
        nodes = list(graph.nodes(data=True))
        edges = list(graph.edges(data=True))

        self.data = {
            'nodes': nodes,
            'edges': edges,
            'directed': graph.is_directed()
        }

        self.height = height
        self.start_layout = start_layout


    @staticmethod
    def from_gexf(handle, *args, **kwargs):
        g = nx.read_gexf(handle)

        return NeuGraph(g, *args, **kwargs)

    def update_gexf(self, fname):
        g = nx.read_gexf(fname)
        nodes = list(g.nodes(data=True))
        edges = list(g.edges(data=True))

        self.data = {
            'nodes': nodes,
            'edges': edges,
            'directed': g.is_directed()
        }
        self.data_changed = True
        return 