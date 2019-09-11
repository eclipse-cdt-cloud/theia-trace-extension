# Trace Viewer extension for Theia
Theia trace viewer extension using the tsp-typescript-client (https://github.com/theia-ide/tsp-typescript-client) and Trace Server Protocol (https://github.com/theia-ide/trace-server-protocol).

Prerequisites for running this extension are the same as those for [running the theia IDE](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites).

## Build the extension
Here is the step in order to build the trace viewer
1. Clone this theia-trace-extension repository
2. `cd theia-trace-extension`
3. Now you are ready to build the application: `yarn`

**Note for some debian-based machines**: On some distros, there are 2 yarn commands. If you get an error message saying **ERROR: There are no scenarios; must have at least one.**, you are using the wrong yarn. See [https://github.com/yarnpkg/yarn/issues/2821](https://github.com/yarnpkg/yarn/issues/2821).

## Running the trace extension
In order to open traces you need a trace server running on your machine. You can use the [Eclipse Trace Compass server](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/?d).
1. `cd browser-app/`
2. `yarn start`
3. Go to http://localhost:3000
