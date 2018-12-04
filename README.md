# Trace Viewer extension for Theia
Theia trace viewer extension using the tsp-typescript-client (https://github.com/theia-ide/tsp-typescript-client) and Trace Server Protocol (https://github.com/theia-ide/trace-server-protocol).

## Build the extension
Here is the step in order to build the trace viewer
1. Clone https://github.com/theia-ide/tsp-typescript-client
2. In that repo run `yarn run build`
3. In the same directory, run `yarn link`
4. Clone this theia-trace-extension repository
5. `cd theia-trace-extension`
6. Run `yarn link tsp-typescript-client`
7. Now you are ready to build the application: `yarn`
