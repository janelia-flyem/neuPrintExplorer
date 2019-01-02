# neuPrintExplorer [![Picture](https://raw.github.com/janelia-flyem/janelia-flyem.github.com/master/images/HHMI_Janelia_Color_Alternate_180x40.png)](http://www.janelia.org)
[![Build Status](https://travis-ci.org/connectome-neuprint/neuPrintExplorer.svg?branch=master)](https://travis-ci.org/connectome-neuprint/neuPrintExplorer)
[![Waffle.io - Columns and their card count](https://badge.waffle.io/connectome-neuprint/neuPrintExplorer.svg?columns=all)](https://waffle.io/connectome-neuprint/neuPrintExplorer) 

neuPrintExplorer is a single page web application that provides simple interfaces to query an EM connectome stored in [neuPrint](https://github.com/connectome-neuprint/neuPrint), which uses the graph database Neo4j.  It contains
a number of plugins to facilitate different types of queries.
The application is written using REACT+Redux and Material-UI.

## Installation

To build the package for development:

    % npm install
    % npm run dev

To build for production:

    % npm install
    % npm run build

Currently, the skeletonization visualization is a third-party
library not built into the npm system.  For now,
add a copy of the library into the build or distribution
folder:

    % mkdir BUILD_DIR/external
    % cd BUILD_DIR/external
    % git clone https://github.com/JaneliaSciComp/SharkViewer.git
    
Finally, you will need plugins to perform the queries and display
the results. Core plugins can be found in their own repository at:
[neuPrintExplorerPlugins](https://github.com/connectome-neuprint/neuPrintExplorerPlugins). 
Clone the repository and then link the plugins into the neuPrintExplorer
repository at the following locations.
       
view-plugins should be linked into:
       
    src/js/components/view-plugins
      
query plugins should be linked into:

    src/js/components/plugins      

## Running

This app is dependent on [neuPrintHTTP](https://github.com/connectome-neuprint/neuPrintHTTP), which is an http REST
API for connectomics that connects to neuPrint and also serves this static application.  To launch neuPrintHTTP and
the web application:

    % neuPrintHTTP -port 11000 config.json

config.json is a configuration file for accessing the backend and pointing to the 'build' created by this distribution.  For examples, please see neuPrintHTTP documentation.
