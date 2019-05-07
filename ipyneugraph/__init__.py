from ._version import version_info, __version__

# from .example import *
from .neugraph import *

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'ipyneugraph',
        'require': 'ipyneugraph/extension'
    }]
