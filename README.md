ipyneugraph
===============================

A library for visualization fo `NeuroDriver`-compatible `.gexf` computational graphs and input/output `.h5` files.

Installation
------------
For a development installation (requires npm),
```
$ git clone https://github.com//ipyneugraph.git
$ cd ipyneugraph
$ pip install -e .
```    
for JupyterLab
```
$ jupyter labextension link js
```

for Jupyter Notebook
```
$ jupyter nbextension install --py --symlink --sys-prefix ipyneugraph
$ jupyter nbextension enable --py --sys-prefix ipyneugraph
```