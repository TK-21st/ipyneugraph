
# ipyneugraph

[![Build Status](https://travis-ci.org//ipyneugraph.svg?branch=master)](https://travis-ci.org//ipyneugraph)
[![codecov](https://codecov.io/gh//ipyneugraph/branch/master/graph/badge.svg)](https://codecov.io/gh//ipyneugraph)


An IPyWidget extension for handling NeuroDriver-compatible computational graphs.

## Installation

You can install using `pip`:

```bash
pip install ipyneugraph
```

Or if you use jupyterlab:

```bash
pip install ipyneugraph
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

If you are using Jupyter Notebook 5.2 or earlier, you may also need to enable
the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] ipyneugraph
```
