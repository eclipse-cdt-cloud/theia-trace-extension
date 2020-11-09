[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/theia-ide/theia-trace-extension)

# Trace Viewer extension for Theia applications

Theia trace viewer extension using the tsp-typescript-client (https://github.com/theia-ide/tsp-typescript-client) and Trace Server Protocol (https://github.com/theia-ide/trace-server-protocol).

Prerequisites for running this extension are the same as those for [running the theia IDE](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites).

## Consume the trace viewer extension from npm

We plan to distribute this extension on npm. 

Availability: TBD

## Build the extension and example application

Here is the step in order to build the trace viewer

1. Clone this theia-trace-extension repository
2. `cd theia-trace-extension`
3. Now you are ready to build the application: `yarn`

**Note for some debian-based machines**: On some distros, there are 2 yarn commands. If you get an error message saying **ERROR: There are no scenarios; must have at least one.**, you are using the wrong yarn. See [https://github.com/yarnpkg/yarn/issues/2821](https://github.com/yarnpkg/yarn/issues/2821).

## Try the trace extension

This repository contains an example trace-viewer application that includes the trace extension. It has two versions:

- _browser_: a "browser" application, accessed with a web browser
- _electron_: a native desktop application

### Run the Trace Server

In order to open traces you need a trace server running on the same machine as the trace extension. You can download the [Eclipse Trace Compass server](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/?d) or let `yarn` download and run it:

```bash
  $ yarn download:server
  $ yarn start:server
```

You can also build the trace-server yourself using Trace Compass and the Incubator, take a look at the [instructions here](https://www.eclipse.org/tracecompass/download.html#trace-server).

### Run the example app

From the repo root, run either

```bash
  $ yarn start:browser
```

And go to `http://localhost:3000`.

or

```bash
  $ yarn start:electron
```

And use the Electron application.

### Change the trace server URL

By default, the trace server is expected to be on responding at `http://localhost:8080/tsp/api`. If it is not the case, the URL can be changed using the `TRACE_SERVER_URL` environment variable when running the app.

For example, to start the browser example app with a specific URL, one can run

```bash
 $ TRACE_SERVER_URL=https://my.trace.server:port/tsp/api yarn start:browser
```

## Package the Example Theia Trace Viewer Application

It's possible to package the repo's example application with `electron-builder`. After running `yarn` in the repo root, do:

```bash
  $ cd electron-app
  $ yarn package
```

  The configured Linux packaging(s) will be generated folder `electron-app/dist`

## Using the trace extension
This section describes how to operate the Theia trace extension to view and analyze traces. The UI, view interactions, and UX are prelimiary and subject to revisions in the future.

![theia-trace-extension](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-0.0.1.png)

### Open trace(s)
To open a trace in the Theia Trace Extension, use the **File Explorer** in Theia to navigate to the trace directory. Then right-mouse click on the trace and select menu **Open With->Open Trace(s)**.

![Open trace(s)](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-open-traces-0.0.1.png)

If the selection is a single file, then the tool will open the file directly as an experiment.

If the selection is a directory, then the tool will look for traces in **Common Trace Format (CTF)** format, such as **Linux Tracing Toolkit traces (LTTng)** Kernel and UST (Userspace) traces, and open all found CTF traces as an experiment. With this you're able to open e.g. LTTng Kernel and UST Traces at the same time.

Note that an experiment is a collection of traces that are analyzed together where each event of each trace in the experiment is analyzed in chronological order.

The example Trace Compass trace server above supports LTTng Kernel and UST traces. Example LTTng traces can be retrieved from the [Trace Compass Tutorials](https://github.com/tuxology/tracevizlab). Just download the archive [TraceCompassTutorialTraces](https://github.com/tuxology/tracevizlab/blob/master/labs/TraceCompassTutorialTraces.tgz), extract them into a local directory on your computer. They can also be automatically downloaded by running `yarn download:sample-traces` from the repository's root.

### Open the Trace Explorer
To open the **Trace Explorer**, select menu **View** from the top-level menu and then select **Trace Explorer** in the list of views. Then the **Trace Explorer** icon will be added on the right side below the **File Explorer** Icon. 

Select the **Trace Explorer** icon to switch to the trace explorer.

![Trace Explorer](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-trace-explorer-0.0.1.png)

Now, you will see 3 sections: **Opened experiments**, **Available analysis** and **Time Graph Tooltip**. Select the experiment you opened and the available analysis will be populated. Now you can select different analysis and the graphs will be added into a single container view for that experiment.

### Navigation and zooming
There is only a limited number of such operations and they are only implemented in the Time Graph views (the ones looking like Gantt charts). For Zoom-in/out use CTRL+mouse wheel. Or use left mouse drag on time axis on top. Navigating the trace you can use the scrollbar at the bottom of the experiment container.

### Time Graph Tooltip
Currently, the **Time Graph Tooltip** is populated when selecting a state in a Time Graph view.