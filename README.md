# Trace Viewer extension for Theia
Theia trace viewer extension using the tsp-typescript-client (https://github.com/theia-ide/tsp-typescript-client) and Trace Server Protocol (https://github.com/theia-ide/trace-server-protocol).

## Build the extension
Here is the step in order to build the trace viewer
1. Clone this theia-trace-extension repository
2. `cd theia-trace-extension`
3. Now you are ready to build the application: `yarn`

## Running the trace extension
In order to open traces you need a trace server running on your machine. You can use the [Eclipse Trace Compass server](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/?d).
1. `cd browser-app/`
2. `yarn start`
3. Go to http://localhost:3000