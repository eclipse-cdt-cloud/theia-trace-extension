# Trace Viewer extension for Theia applications

Theia trace viewer extension using the [tsp-typescript-client](https://github.com/theia-ide/tsp-typescript-client) and [Trace Server Protocol](https://github.com/theia-ide/trace-server-protocol).

Prerequisites for running this extension are the same as those for [running the Theia IDE](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites).

**👋 Want to help?** Read our [new contributor guide](https://github.com/theia-ide/theia-trace-extension#new-contributors) and see [how to contribute code](https://github.com/theia-ide/theia-trace-extension#how-to-contribute-code).
⚠️ Apart from the live demo, the application and its development environment only work on Linux operating systems.

## What is Tracing?

Tracing is another tool in the developer or sysadmin's toolbox. It is best used to understand very complex systems, or even simple ones, but the real added value comes when trying to **understand complexity when all other approaches fail**.

* Read more about [when tracing is required for understanding a problem](https://github.com/dorsal-lab/Tracevizlab/tree/master/labs/001-what-is-tracing#when-to-trace).

`Tracing` consists in recording specific information during a program's or operating system's execution to better understand what is happening on the system. Every location in the code that we want to trace is called a `tracepoint` and every time a tracepoint is hit is called an `event`.

The `tracing` we're discussing here is high speed, low overhead tracing. With such tracing, the tracepoints can be present in the code at all times (linux has tons of tracepoints in its code, ready to be hooked to), they have a near-zero overhead when not tracing and a very low one one with a tracer enabled. Tracers can handle hundreds of thousands events/second.

* Learn more about tracing [here](https://github.com/dorsal-lab/Tracevizlab/tree/master/labs/001-what-is-tracing#what-is-tracing).

Source: Text adapted from tracevizlab [001-what-is-tracing](https://github.com/dorsal-lab/Tracevizlab/tree/master/labs/001-what-is-tracing)

## Try a live demo via Gitpod

Click the Gitpod button below to access a live demo of the trace viewer. In a couple of clicks and around 2 minutes, you'll be on your way!

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/theia-ide/theia-trace-extension)

Prerequisites: A GitHub account (for logging into Gitpod)

* Click [here](https://gitpod.io/#https://github.com/theia-ide/theia-trace-extension) to open Gitpod.
* After logging in, it takes around a minute for Gitpod to set up the in-browser IDE used to build the project.
* When the workspace has loaded, the project builds automatically in about a minute. Then, the workspace pops a notification saying a service (i.e. the tool) is now available. Open the application in the browser.
![gitpod-service-ready-notification](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/gitpod-service-ready-notification-0.0.3.PNG)
* If you don't see a notification, follow this alternative way to [open the application](https://github.com/theia-ide/theia-trace-extension#open-via-remote-explorer).
* After opening the tool, the interface loads in a few seconds.
* Now you're ready to try the trace viewer!
  * Head to the trace viewer tab in the left side menu to get started.
  * Click the "Open Trace" button, and then select a directory containing traces, e.g. “103compare-package-managers → apt”
  * The tool is loaded with the example traces from a set of [Trace Visualisation Labs](https://github.com/tuxology/tracevizlab). To analyze your own traces, [download the application](https://github.com/theia-ide/theia-trace-extension#download-the-application) for Linux.

![gitpod-live-demo-setup](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/gitpod-live-demo-setup-0.0.2.gif)

## Download an external build of the application

If you'd like to explore your own traces, you can **[download a Theia IDE build with this trace viewer extension here](https://www.dorsal.polymtl.ca/files/other/electron-theia-trace-example-app-0.0.1.AppImage)!**

* **For Linux systems only**
* **Prerequisite: Java 11** (required since this tool reuses the [Eclipse Trace Compass server](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/?d) which runs on Java)
  * If you get a confusing error "Error opening serial port ${this.port}. (Port busy)" when you try to run the app, it's likely that Java is missing.
* **No compilation or additional downloads necessary!** Just change the AppImage file's permissions to make it executable (command: `chmod +x <filename>`) and run it.

## Consume the trace viewer extension from npm

The **theia-trace-extension** project publishes the following packages to npm:

* [theia-traceviewer](https://www.npmjs.com/package/theia-traceviewer): The Theia trace viewer extension. Add this package to the package.json of your Theia application.
* [traceviewer-base](https://www.npmjs.com/package/traceviewer-base): This package contains trace management utilities for managing traces using Trace Server applications that implement the TSP.
* [traceviewer-react-components](https://www.npmjs.com/package/traceviewer-react-components): This package contains views and utilities for visualizing traces and logs via the TSP connected to a Trace Server application.

While being initially used within the *theia-traceviewer*, the code base of *traceviewer-base* and *traceviewer-react-components* is independent of any Theia APIs and can be integrated into other web applications.

## Build the extension and example application

Here is the step in order to build the trace viewer

1. Clone this theia-trace-extension repository
2. `cd theia-trace-extension`
3. Now you are ready to build the application: `yarn`

**Note for some Debian-based machines**: On some distributions, there are 2 yarn commands. If you get an error message saying **ERROR: There are no scenarios; must have at least one.**, you are using the wrong yarn. See [https://github.com/yarnpkg/yarn/issues/2821](https://github.com/yarnpkg/yarn/issues/2821).

You can also run two scripts to watch for changes and rebuild automatically:

1. From the root, run:

   ```bash
   yarn tswatch # to compile TypeScript files
   ```

2. In parallel, run:

   ```bash
   cd examples/<browser or electron>
   yarn watch # to update the frontend bundles (loaded by the browser)
   ```

## Try the trace extension

This repository contains an example trace-viewer application that includes the trace extension. It has two versions:

* *browser*: a "browser" application, accessed with a web browser
* *electron*: a native desktop application

You can find those example applications under `examples/`.

### Run the Trace Server

In order to open traces, you need a trace server running on the same machine as the trace extension. You can download the [Eclipse Trace Compass server](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/?d) or let `yarn` download and run it:

```bash
yarn download:server
yarn start:server
```

You can also build the trace-server yourself using Trace Compass and the Incubator. Take a look at the [instructions here](https://www.eclipse.org/tracecompass/download.html#trace-server).

### Run the example app

From the repo root, run either

```bash
yarn start:browser
```

and go to `http://localhost:3000`.

Or, run

```bash
yarn start:electron
```

and use the Electron application.

If there are errors that occurred while starting the app, see [Troubleshooting](#troubleshooting) for known issues.

### Change the trace server URL

By default, the application expects the trace server to be responding at `http://localhost:8080/tsp/api`. If a different trace server location is being used, the URL can be changed using the `TRACE_SERVER_URL` environment variable when running the app.

For example, to start the browser example app with a specific URL, one can run

```bash
TRACE_SERVER_URL=https://my.trace.server:port/tsp/api yarn start:browser
```

## Package the Example Theia Trace Viewer Application

It is possible to package the repository's example application with `electron-builder`. After running `yarn` in the repo root, run:

```bash
cd examples/electron
yarn package
```

The configured Linux package(s) will be generated in the folder `examples/electron/dist`

## Using the trace extension

This section describes how to operate the Theia trace extension to view and analyze traces. The UI and view interactions are preliminary and subject to revisions in the future.

![theia-trace-extension](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-0.0.3.png)

### Open the Trace Viewer

To open the **Trace Viewer**, select the **Trace Viewer** icon in the left sidebar:

![Trace Viewer Icon](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-icon.png)

#### Add Trace Viewer to sidebar

If the **Trace Viewer** icon is not in the left sidebar, select menu **View** from the top-level menu and then select **Trace Viewer** in the list of views. The **Trace Viewer** icon will appear on the left, below the **File Explorer** Icon.

![Add Trace Viewer to sidebar](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-open-trace-viewer.gif)

### Open a trace

There are a few ways to open traces. The main ones are using the **Open Trace Dialog** or the **File Explorer**. There are still some inconsistencies between them.

| Desired action                                 | via Open Trace Dialog | via File Explorer |
|------------------------------------------------|-----------------------|-------------------|
| Open single CTF trace (folder)                 | ✓                     | ✓                |
| Open folder of CTF traces (create trace group) | ✓                     | ✓                |
| Open single file trace (ex. JSON Chrome trace) |                       | ✓                |

Regardless of the opening method used, if the selection is a folder, the tool will look for traces in **Common Trace Format (CTF)** format, such as **Linux Tracing Toolkit traces (LTTng)** Kernel and UST (Userspace) traces, and open all found CTF traces together under the same timeline. The trace events of each CTF trace will be analyzed in chronological order. With this, several traces can be opened as a group (e.g. LTTng Kernel and UST Traces).

The example Trace Compass trace server above supports LTTng Kernel and UST traces. Example LTTng traces can be retrieved from the [Trace Compass Tutorials](https://github.com/dorsal-lab/tracevizlab). Just download the archive [TraceCompassTutorialTraces](https://github.com/dorsal-lab/tracevizlab/blob/master/labs/TraceCompassTutorialTraces.tgz), extract them into a local directory on your computer. They can also be automatically downloaded by running `yarn download:sample-traces` from the repository's root.

#### Via the Open Trace dialog (folders only)

This is the most intuitive way to open traces and trace groups, but it can only works with folders. So this dialog works for opening:

* **Single Common Trace Format (CTF) traces**
* Folders containing several CTF traces

⚠️ The root of a **Common Trace Format (CTF)** trace is a **folder**. A CTF trace is a folder that contains metadata and trace data files.

![Open Trace Dialog](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-open-trace-dialog.gif)

#### Via the File Explorer

You can open any supported trace format via the file explorer context menu. For a single trace, right-click on the trace file, or folder (for a CTF trace), then select **Open With → Open Trace**. To open several CTF trace files as a group, right-click on the parent folder instead.

![Open With Trace Viewer](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-open-with-trace-viewer.gif)

### Open a view

To open a view, in the **Trace Viewer** select an opened trace in the **Opened Traces** widget, then click on a view in the **Available Views** list to open it.

![Open View](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-open-view.gif)

⚠️ **An available view can display empty results, even if the analysis completes correctly.** The **Available Views** widget lists all the views that could be used with the selected trace(s) based on their trace format (regardless of the event types that were enabled in the trace or the events present in the trace). The tool cannot yet inform the user whether results are empty because of:

* A bad reason: Some events required for the analysis were not enabled in the trace. [#322](https://github.com/theia-ide/theia-trace-extension/issues/322)
* A neutral reason: All required events are enabled in the trace, but there are no instances of these events in the trace.

### Navigation

#### Zooming

* Zoom to a specific range: Click and hold the right mouse button on the chart, drag to select zoom range
* Ctrl + Mouse scroll
* WASD keys: 'W' zooms in, 'S' zooms out
* Toolbar: Zoom in, Zoom out, Reset zoom (see screenshot)

![Trace Viewer Toolbar Zoom Buttons](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-toolbar-zoom-buttons.png)

#### Panning

* Arrow keys
* WASD keys: 'A' pans left, 'D' pans right

#### Important limitations

* XY Charts can be painfully laggy to navigate even with reasonable trace sizes. [#470](https://github.com/theia-ide/theia-trace-extension/issues/470)
* There is no visual indication when chart data is still loading. Data can pop into existence several seconds after the chart is opened or after navigation.

### Item properties

This section shows detailed information about a selected:

* Time Graph State (Bar section in a Gantt chart), or
* Event in the Events Table

![Trace Viewer Item Properties](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-item-properties-0.0.2.png)

## New contributors

⚠️ **Linux only!** Currently, the development environment for this project only works on Linux.

### Explore the project context

* **Check out the [tracevizlabs](https://github.com/dorsal-lab/Tracevizlab).** You don't need to complete all of them, but reading a couple is good for context. Lab sets 0 and 1 are especially useful.
* **Browse recent conference presentations.** They give an overview of the trace viewer's goals, [architecture](https://github.com/theia-ide/theia-trace-extension#architecture), and functionality.
  * *Trace Compass Cloud: Eclipse Trace Compass's migration towards Theia*, [slides](https://www.eclipsecon.org/sites/default/files/slides/EclipseCon2021-TraceCompassCloud.pdf), [video](https://www.youtube.com/watch?v=DFxWXE4A-uQ) - Bernd Hufmann, Ericsson AB (EclipseCon 2021)
  * *Using Theia to take trace analysis and visualization to the next level*, [slides](https://www.eclipsecon.org/sites/default/files/slides/EclipseConEurope2019-TraceCompass-Theia.pdf), [video](https://www.youtube.com/watch?v=Fysg1mOadik) - Bernd Hufmann, Ericsson AB (EclipseCon 2019)
  * *A New Flexible Architecture for Trace Compass*, [slides](https://tracingsummit.org/ts/2019/files/Tracingsummit2019-theia-dagenais.pdf), [video](https://www.youtube.com/watch?v=8s5vGf45e-g) - Michel Dagenais, Polytechnique Montréal ([Tracing Summit 2019](https://tracingsummit.org/ts/2019/))
* **Get an [overview of external components](https://github.com/theia-ide/theia-trace-extension#related-code)** used by this trace viewer. See how they interact.

### Start with a small change

* **Explore the [Gitpod demo](https://github.com/theia-ide/theia-trace-extension#try-a-live-demo-via-gitpod).** Experiment with the trace viewer. Start exploring its code via Gitpod's in-browser IDE.
* **Start with a small frontend improvement.** A relevant change can be [less than 5 lines of code](https://github.com/theia-ide/theia-trace-extension/pull/369/files). The Theia-based frontend repo is much less complex than the Trace Server's, so by starting in the frontend you'll learn high-level context about the project's different components without being overwhelmed with complexity.
  * [Good first issues](https://github.com/theia-ide/theia-trace-extension/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
  * *Develop with Gitpod to initially avoid dev setup.* Put `gitpod.io/#` before your project fork's GitHub URL to open an in-browser IDE and initially avoid any local dev setup. This dev approach works best for small changes because Gitpod workspaces are volatile.
  * *Learn [how to contribute code](https://github.com/theia-ide/theia-trace-extension#how-to-contribute-code).* Starting with a tiny change means you can first focus on exploring the code as well as learning the submission and review process (which is a significant learning step if you've never submitted a PR before).

## How to contribute code

**Changes to the project** are made by submitting code with a pull request (PR).

* [How to write and submit changes](https://www.dataschool.io/how-to-contribute-on-github/)
* [Example pull request](https://github.com/theia-ide/theia-trace-extension/pull/402)

**Good commit messages** make it easier to review code and understand why the changes were made. Please include a:

* *Title:* Concise and complete title written in imperative (e.g. "Update Gitpod demo screenshots" or "Single-click to select or open trace")
* *Problem:* What is the situation that needs to be resolved? Why does the problem need fixing? Link to related issues (e.g. "Fixes [#317](https://github.com/theia-ide/theia-trace-extension/issues/317)").
* *Solution:* What changes were made to resolve the situation? Why are these changes the right fix?
* *Impact:* What impact do these changes have? (e.g. Numbers to show a performance improvement, screenshots or a video for a UI change)
* [*Sign-off:*](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---signoff) Use your full name and a long-term email address. This certifies that you have written the code and that, from a licensing perspective, the code is appropriate for use in open-source.

Other commit information:

* [How to format the message](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
* [Example commit message](https://github.com/theia-ide/theia-trace-extension/commit/bc18fcd110d7b8433293692421f2e4fb49f89bd6)

## Related code

This trace viewer depends on code from several other repos. Sometimes resolving issues in the trace viewer repo requires making changes in these code bases:

| Project | Description | Related issues | Links |
|---------------|----|--------------------------|---|
| [Theia](https://theia-ide.org/) | Theia is a framework for making custom IDEs. It provides reusable components (e.g. text editor, terminal) and is extensible. For example, this trace viewer is an extension for Theia-based IDEs. | | [Code](https://github.com/eclipse-theia/theia), [Ecosystem](https://github.com/theia-ide) |
| [Trace Compass](https://www.eclipse.org/tracecompass/) | Trace analysis tool and precursor to this trace viewer. | [label:"Trace Compass"](https://github.com/theia-ide/theia-trace-extension/labels/Trace%20Compass) | [Dev info](https://wiki.eclipse.org/Trace_Compass), [Dev setup](https://wiki.eclipse.org/Trace_Compass/Development_Environment_Setup) |
| [Trace Compass Server](https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/?d) | A reference implementation of a Trace Server. Manages and analyzes trace files and provides this data to the trace viewer over the [Trace Server Protocol (TSP)](https://github.com/theia-ide/trace-server-protocol). This Trace Server implementation was originally part of Trace Compass, so it requires the same dev setup. Because a protocol is used for communication (TSP), it is possible to develop alternative Trace Servers that are independent of Trace Compass. | [label:"Trace Server"](https://github.com/theia-ide/theia-trace-extension/labels/Trace%20Server) | [Dev setup](https://wiki.eclipse.org/Trace_Compass/Development_Environment_Setup) (same as Trace Compass), [Code](https://git.eclipse.org/r/admin/repos/tracecompass.incubator/org.eclipse.tracecompass.incubator) (same repo as Trace Compass incubator) |
| [Trace Server Protocol (TSP)](https://github.com/theia-ide/trace-server-protocol) | Protocol used by the trace viewer to communicate with the trace server. | [label:"trace server protocol"](https://github.com/theia-ide/theia-trace-extension/labels/trace%20server%20protocol) | |
| [Client-side Trace Server Protocol implementation](https://github.com/theia-ide/tsp-typescript-client) | A client-side implementation of the Trace Server Protocol. Allows the trace viewer to communicate with the server. | | |
| [Timeline Chart](https://github.com/theia-ide/timeline-chart) | Implements the Gantt charts used in this trace viewer. | [label:timeline-chart](https://github.com/theia-ide/theia-trace-extension/labels/timeline-chart) | |

## Troubleshooting

### Windows

This section discusses known issues on Windows.

#### Starting the Trace Extension in the browser

When starting the Trace Extension using `yarn start:browser` on Windows, you might get the following error:

```
$ TRACE_SERVER_PATH=../../trace-compass-server/tracecompass-server theia start --plugins=local-dir:../plugins
'TRACE_SERVER_PATH' is not recognized as an internal or external command,
operable program or batch file.
error Command failed with exit code 1.
```

The expression `TRACE_SERVER_PATH=../../trace-compass-server/tracecompass-server` is not a valid Windows expression. For now, if you want to start the Trace Extension in the browser, remove the expression from `theia-trace-extension/examples/browser/package.json` at `scripts.start` and the extension should start normally.

#### Adding new packages

When adding new packages on Windows using yarn (e.g `yarn add @vscode/codicons`) you might encounter the following error:

```
An unexpected error occurred: "expected workspace package to exist for {some package name}"
```

A simple solution would be restoring the project to a clean state prior to the installation of the package, then restarting Powershell in administrator mode and re-run the command to add the new package. 

## Architecture

The diagram below shows the main parts of the Trace Viewer's front end (left side) and back end (right side), as well as how they exchange information.

![Trace viewer architecture diagram](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-viewer-architecture.PNG)
Source: [EclipseCon 2021 Presentation](https://www.eclipsecon.org/sites/default/files/slides/EclipseCon2021-TraceCompassCloud.pdf) (slide 18), Bernd Hufmann

## Gitpod: Open the Trace Viewer extension

When the project is opened in Gitpod, it should build automatically and then pop a notification saying a service (i.e. the example application) is now available.

![gitpod-service-ready-notification](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/gitpod-service-ready-notification-0.0.2.PNG)

### Open via Remote Explorer

If there is no notification, you can open the application directly in the **Remote Explorer** view.

1. The **Remote Explorer** view can be opened:
   * Via the Ports section in the bottom bar (see screenshot below), or
   * Via the Command palette or Open View menu (type "view remote explorer")
2. Once in the **Remote Explorer**, select "Open Browser" for the port 3000. By default, the application is hosted on port 3000.

![Open Browser](https://raw.githubusercontent.com/theia-ide/theia-trace-extension/master/doc/images/theia-trace-extension-open-browser.png)

## Tests

To run tests once, at the root of the project, run:

```bash
yarn test --verbose
```

To keep tests running, use:

```bash
yarn test --verbose --watch
```

### Test coverage

The following command prints a coverage report to the terminal. As of now, it covers all typescript files of the project, including those that are not supposed to have tests.

```bash
yarn test --coverage --collectCoverageFrom='src/**/*.ts'
```

## About ADRs

ADRs are [Architectural Decision Records][adr].

* The `./doc/adr` directory was initialized using `adr-init` based on [adr-tools-python][tools].
* The `adr-new` command (from [adr-tools-python][tools]) is used to add new ADRs further.
* That tool can be installed locally (only once) using [the instructions below](#python-setup).
* The latter also shows how to activate a Python virtual environment to locally run commands.
* These aforementioned `adr-` commands are [meant to be executed from this root directory][tools].
* ADRs should be preferred to [design documents][docs] for their structure and reviewability.

[This script][render] is used to generate ADR's Mermaid diagram images for GitHub rendering.

* One may need to disable its use of the `in-container` argument for that script to work locally.
* It is otherwise possible to render such diagrams when in VS Code using [this extension](ext).
* As for GitHub, it is now [capable of automatically rendering these][gh] diagrams natively.

### Python setup

To initialize a local virtual environment, type the following commands in the root directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
````

* The virtual environment can be replaced with another setup locally.
* Above, the `./requirements.txt` file has [the ADR tool][tools] to install.

[adr]: https://adr.github.io
[docs]: https://wiki.eclipse.org/Trace_Compass/Design_Documents
[ext]: https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid
[gh]: https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/
[render]: https://github.com/nielsvaneck/render-md-mermaid#render-md-mermaidsh
[tools]: https://pypi.org/project/adr-tools-python/
