## Description

The Trace Viewer react-components package contains views and utilities for visualizing traces and logs via the Trace Server Protocol connected a Trace Server applications. While being initially used within the Theia Trace Viewer extension, its code base is independent to any Theia APIs and hence can be integrated in other web applications.

## Additional Information

- [Theia Trace Viewer Extension](https://github.com/theia-ide/theia-trace-extension)
- [Trace Server Protocol](https://github.com/theia-ide/trace-server-protocol)
- [Reference Trace Server - Download (Eclipse Trace Compass)](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/)

## Tests

To run tests once, at the root of the project do:

```shell
yarn test --verbose
```

To keep tests running do:

```shell
yarn test --verbose --watch
```

### Test coverage

The following command prints a coverage report to the terminal. As of now it covers all typescript files of the project, including those that are not supposed to have tests.

```shell
yarn test --coverage --collectCoverageFrom='src/**/*.ts'
```
