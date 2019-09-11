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
In order to open traces you need a trace server running on the same machine as the trace extension. You can download the [Eclipse Trace Compass server](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/?d) or build it yourself using Trace Compass and the Incubator, take a look at the [instruction here](https://www.eclipse.org/tracecompass/download.html).
1. Start the trace server: `./tracecompass-server`
2. From the theia-trace-extension folder: `cd browser-app/`
3. `yarn start`
4. Go to http://localhost:3000
