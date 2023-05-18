# Description

The Trace Viewer react-components package contains views and utilities for visualizing traces and logs via the Trace Server Protocol connected a Trace Server applications. While being initially used within the Theia Trace Viewer extension, its code base is independent to any Theia APIs and hence can be integrated in other web applications.

## Styling

The Trace Viewer react-components package does not define CSS styles for its components, but it provides CSS variables that can be map to custom CSS styles or variables. Any projects that use the package should define its own CSS styles for the components. All the mappable variables have the prefix `--trace-viewer`.

An example (of integration with Theia) that contains all the mappable variables can be found in [here](../../theia-extensions/viewer-prototype/style/trace-viewer.css).

## Additional Information

- [Theia Trace Viewer Extension](https://github.com/eclipse-cdt-cloud/theia-trace-extension)
- [Trace Server Protocol](https://github.com/eclipse-cdt-cloud/trace-server-protocol)
- [Reference Trace Server - Download (Eclipse Trace Compass)](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/)
