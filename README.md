# Trace Viewer extension for Theia
Theia trace viewer extension using the tsp-typescript-client (https://github.com/theia-ide/tsp-typescript-client) and Trace Server Protocol (https://github.com/theia-ide/trace-server-protocol).

## Build the extension
Here is the step in order to build the trace viewer
1. Clone this theia-trace-extension repository
2. `cd theia-trace-extension`
3. Now you are ready to build the application: `yarn`

## Running the trace extension
In order to open traces you need a trace server running on your machine. You can use the [Eclipse Trace Compass server](http://www.eclipse.org/downloads/download.php?file=/tracecompass.incubator/trace-server/rcp/trace-compass-server0.0.1-20190403-1002-linux.gtk.x86_64.tar.gz).
1. `cd browser-app/`
2. `yarn start`
3. Go to http://localhost:3000