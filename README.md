# Trace Viewer extension for Theia applications

Theia trace viewer extension using the [tsp-typescript-client][tspc] and [Trace Server Protocol][tsp].

Prerequisites for running this extension are the same as those for [running the Theia IDE][theia-prereq].

**👋 Want to help?** Read our [contributor guide](CONTRIBUTING.md) and follow the instructions to contribute code.
⚠️ The application and its development environment works best on Linux operating systems. If you are trying to run the application or the development environment on Windows or MacOs and you are encountering issues, please open a [GitHub issue][issues].

## What is Tracing?

Tracing is another tool in the developer or sysadmin's toolbox. It is best used to understand very complex systems, or even simple ones, but the real added value comes when trying to **understand complexity when all other approaches fail**.

* Read more about [when tracing is required for understanding a problem][tracevizlab-when].

`Tracing` consists in recording specific information during a program's or operating system's execution to better understand what is happening on the system. Every location in the code that we want to trace is called a `tracepoint` and every time a tracepoint is hit is called an `event`.

The `tracing` we're discussing here is high speed, low overhead tracing. With such tracing, the tracepoints can be present in the code at all times (linux has tons of tracepoints in its code, ready to be hooked to), they have a near-zero overhead when not tracing and a very low one one with a tracer enabled. Tracers can handle hundreds of thousands events/second.

* Learn more about tracing [here][tracevizlab-what-chapter].

Source: Text adapted from tracevizlab [001-what-is-tracing][tracevizlab-what-file]

## Try a live demo

### Release

Prerequisite: A GitHub account (for logging into the demo)

You can access a live demo of the trace viewer [here][cdt-cloud-demo]. The following [video][cdt-cloud-demo-video] also shows how try the live demo.

### Nightly (via Gitpod)

Click the Gitpod button below to access a live demo of the trace viewer. In a couple of clicks and around 2 minutes, you'll be on your way!

[![Gitpod ready-to-code][gitpod-logo]][gitpod-ext]

Prerequisite: A GitHub account (for logging into Gitpod)

* Click [here][gitpod-ext] to open Gitpod.
* After logging in, it takes around a minute for Gitpod to set up the in-browser IDE used to build the project.
* When the workspace has loaded, the project builds automatically in about a minute. Then, the workspace pops a notification saying a service (i.e. the tool) is now available. Open the application in the browser.
![gitpod-service-ready-notification][gitpod-service-ready-notification]
* If you don't see a notification, follow this alternative way to [open the application](#gitpod-open-via-remote-explorer).
* After opening the tool, the interface loads in a few seconds.
* Now you're ready to try the trace viewer!
  * Head to the trace viewer tab in the left side menu to get started.
  * Click the "Open Trace" button, and then select a directory containing traces, e.g. “103compare-package-managers → apt”
  * The tool is loaded with the example traces from a set of [Trace Visualization Labs][tracevizlab]. To analyze your own traces, [download the application](#download-an-external-build-of-the-application) for Linux.

![gitpod-live-demo-setup][gitpod-live-demo-setup]

## Download an external application

If you'd like to explore your own traces, you can download a pre-built `CDT Cloud Blueprint` IDE, which includes the Theia trace viewer extension: [here][app-image]

* **Prerequisite: trace-server** Install a [trace server][tc-server] and configure its path in the application's preferences (Trace Server: Path)
* **Prerequisite: Java 17** (required since this tool uses the [Eclipse Trace Compass server][tc-server] which runs on Java)
  * If you get a confusing error "Error opening serial port ${this.port}. (Port busy)" when you try to run the app, it's likely that Java is missing.
* **No compilation or additional downloads necessary!** Just change the AppImage file's permissions to make it executable (command: `chmod +x <filename>`) and run it.

## Consume the trace viewer extension from npm

The **theia-trace-extension** project publishes the following packages to npm:

* [theia-traceviewer][npm-viewer]: The Theia trace viewer extension. Add this package to the package.json of your Theia application.
* [traceviewer-base][npm-viewer-base]: This package contains trace management utilities for managing traces using Trace Server applications that implement the TSP.
* [traceviewer-react-components][npm-viewer-react]: This package contains views and utilities for visualizing traces and logs via the TSP connected to a Trace Server application.

While being initially used within the *theia-traceviewer*, the code base of *traceviewer-base* and *traceviewer-react-components* is independent of any Theia APIs and can be integrated into other web applications.

## Build the extension and example application

First, you need Node.js and yarn:

It's suggested to install [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage node on your machine. Once that's done, install the required version:

```bash
   nvm install 18
   # optional: make it the default version
   nvm alias default
   # or set it every time like so
   nvm use 18
```

Then install `yarn`:

```bash
npm i -g yarn  # the default version should be ok
```

Here is the step in order to build the trace viewer

1. Clone this theia-trace-extension repository
2. `cd theia-trace-extension`
3. Now you are ready to build the application: `yarn`

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

Alternatively, you may find example applications in the [trace-viewer-examples] repository, including some "batteries included" Docker images that also contain the trace server and demo traces

### Run the Trace Server

In order to open traces, you need a trace server running on the same machine as the trace extension. You can download the [Eclipse Trace Compass server][tc-server] or let `yarn` download and run it:

```bash
yarn download:server
yarn start:server
```

You can also build the trace-server yourself using Trace Compass and the Incubator. Take a look at the [instructions here][tc-server-build].

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

The configured Linux package(s) will be generated in the `examples/electron/dist` folder:

```bash
cd dist
./Theia\ Trace\ Example\ Application-0.1.0.AppImage
```

## Using the trace extension

This section describes how to operate the Theia trace extension to view and analyze traces. The UI and view interactions are preliminary and subject to revisions in the future.

![theia-trace-extension][image-viewer]

### Open the Trace Viewer

To open the **Trace Viewer**, select the **Trace Viewer** icon in the left sidebar:

![Trace Viewer Icon][image-icon]

#### Add Trace Viewer to sidebar

If the **Trace Viewer** icon is not in the left sidebar, select menu **View** from the top-level menu and then select **Trace Viewer** in the list of views. The **Trace Viewer** icon will appear on the left, below the **File Explorer** Icon.

![Add Trace Viewer to sidebar][image-sidebar]

### Open a trace

There are a few ways to open traces. The main ones are using the **Open Trace Dialog** or the **File Explorer**. There are still some inconsistencies between them.

| Desired action                                 | via Open Trace Dialog | via File Explorer |
|------------------------------------------------|-----------------------|-------------------|
| Open single CTF trace (folder)                 | ✓                     | ✓                |
| Open folder of CTF traces (create trace group) | ✓                     | ✓                |
| Open single file trace (ex. JSON Chrome trace) |                       | ✓                |

Regardless of the opening method used, if the selection is a folder, the tool will look for traces in **Common Trace Format (CTF)** format, such as **Linux Tracing Toolkit traces (LTTng)** Kernel and UST (Userspace) traces, and open all found CTF traces together under the same timeline. The trace events of each CTF trace will be analyzed in chronological order. With this, several traces can be opened as a group (e.g. LTTng Kernel and UST Traces).

The example Trace Compass trace server above supports LTTng Kernel and UST traces. Example LTTng traces can be retrieved from the [Trace Compass Tutorials][tracevizlab]. Just download the archive [TraceCompassTutorialTraces][tracevizlab-traces], extract them into a local directory on your computer. They can also be automatically downloaded by running `yarn download:sample-traces` from the repository's root.

#### Via the Open Trace dialog (folders only)

This is the most intuitive way to open traces and trace groups, but it can only works with folders. So this dialog works for opening:

* **Single Common Trace Format (CTF) traces**
* Folders containing several CTF traces

⚠️ The root of a **Common Trace Format (CTF)** trace is a **folder**. A CTF trace is a folder that contains metadata and trace data files.

![Open Trace Dialog][image-dialog]

#### Via the File Explorer

You can open any supported trace format via the file explorer context menu. For a single trace, right-click on the trace file, or folder (for a CTF trace), then select **Open in Trace Viewer**. To open several CTF trace files as a group, right-click on the parent folder instead.

![Open in Trace Viewer][image-open-in-trace-viewer]

### Open a view

To open a view, in the **Trace Viewer** select an opened trace in the **Opened Traces** widget, then click on a view in the **Available Views** list to open it.

![Open View][image-open-view]

⚠️ **An available view can display empty results, even if the analysis completes correctly.** The **Available Views** widget lists all the views that could be used with the selected trace(s) based on their trace format (regardless of the event types that were enabled in the trace or the events present in the trace). The tool cannot yet inform the user whether results are empty because of:

* A bad reason: Some events required for the analysis were not enabled in the trace. [#322][issue-322]
* A neutral reason: All required events are enabled in the trace, but there are no instances of these events in the trace.

### Navigation

#### Zooming

* Zoom to a specific range: Click and hold the right mouse button on the chart, drag to select zoom range
* Ctrl + Mouse scroll
* WASD keys: 'W' zooms in, 'S' zooms out
* Toolbar: Zoom in, Zoom out, Reset zoom (see screenshot)

![Trace Viewer Toolbar Zoom Buttons][image-zoom-buttons]

#### Panning

* Arrow keys
* WASD keys: 'A' pans left, 'D' pans right

#### Important limitations

During updating of a view, a progress wheel is shown in the view's title bar until data is available. Depending on the size of trace, window range, or complexity of the analysis this can take several seconds after the chart is opened or after navigation.

### Item properties

This section shows detailed information about a selected:

* Time Graph State (Bar section in a Gantt chart), or
* Event in the Events Table

![Trace Viewer Item Properties][image-properties]

## Related code

This trace viewer depends on code from several other repos. Sometimes resolving issues in the trace viewer repo requires making changes in these code bases:

| Project | Description | Related issues | Links |
|---------------|----|--------------------------|---|
| [Theia][theia-webpage] | Theia is a framework for making custom IDEs. It provides reusable components (e.g. text editor, terminal) and is extensible. For example, this trace viewer is an extension for Theia-based IDEs. | | [Code][theia-code], [Ecosystem][theia-ecosystem] |
| [Trace Compass][tc-project] | Trace analysis tool and precursor to this trace viewer. | [label:"Trace Compass"][tc-gh-label] | [Dev info][tc-dev-info], [Dev setup][tc-dev-setup] |
| [Trace Compass Server][tc-server] | A reference implementation of a Trace Server. Manages and analyzes trace files and provides this data to the trace viewer over the [Trace Server Protocol (TSP)][tsp]. This Trace Server implementation was originally part of Trace Compass, so it requires the same dev setup. Because a protocol is used for communication (TSP), it is possible to develop alternative Trace Servers that are independent of Trace Compass. | [label:"Trace Server"][tc-server-gh-label] | [Dev setup][tc-dev-setup] (same as Trace Compass), [Code][tci-code] (same repo as Trace Compass incubator) |
| [Trace Server Protocol (TSP)][tsp] | Protocol used by the trace viewer to communicate with the trace server. | [label:"trace server protocol"][tsp-gh-label] | |
| [Client-side Trace Server Protocol implementation][tspc] | A client-side implementation of the Trace Server Protocol. Allows the trace viewer to communicate with the server. | | |
| [Timeline Chart][timeline-chart] | Implements the Gantt charts used in this trace viewer. | [label:timeline-chart][timeline-chart-gh-label] | |

## Troubleshooting

### Windows

This section discusses known issues on Windows.

#### Starting the Trace Extension in the browser

When starting the Trace Extension using `yarn start:browser` on Windows, you might get the following error:

```bash
$ TRACE_SERVER_PATH=../../trace-compass-server/tracecompass-server theia start
'TRACE_SERVER_PATH' is not recognized as an internal or external command,
operable program or batch file.
error Command failed with exit code 1.
```

The expression `TRACE_SERVER_PATH=../../trace-compass-server/tracecompass-server` is not a valid Windows expression. For now, if you want to start the Trace Extension in the browser, remove the expression from `theia-trace-extension/examples/browser/package.json` at `scripts.start` and the extension should start normally.

#### Adding new packages

When adding new packages on Windows using yarn (e.g `yarn add @vscode/codicons`) you might encounter the following error:

```bash
An unexpected error occurred: "expected workspace package to exist for {some package name}"
```

A simple solution would be restoring the project to a clean state prior to the installation of the package, then restarting Powershell in administrator mode and re-run the command to add the new package.

## Architecture

The diagram below shows the main parts of the Trace Viewer's front end (left side) and back end (right side), as well as how they exchange information.

![Trace viewer architecture diagram][image-arch]
Source: [EclipseCon 2021 Presentation][eclipsecon2021-slides] (slide 18), Bernd Hufmann

## Gitpod: Open the Trace Viewer extension

When the project is opened in Gitpod, it should build automatically and then pop a notification saying a service (i.e. the example application) is now available.

![gitpod-service-ready-notification][gitpod-service-ready-notification]

### Gitpod: Open via Remote Explorer

If there is no notification, you can open the application directly in the **Remote Explorer** view.

1. The **Remote Explorer** view can be opened:
   * Via the Ports section in the bottom bar (see screenshot below), or
   * Via the Command palette or Open View menu (type "view remote explorer")
2. Once in the **Remote Explorer**, select "Open Browser" for the port 3000. By default, the application is hosted on port 3000.

![Open Browser][image-open-browser]

## Tests

### Unit tests

To run tests once, at the root of the project, run:

```bash
yarn test --verbose
```

To keep tests running, use:

```bash
yarn test --verbose --watch
```

#### Test coverage

The following command computes the test coverage for the unit tests and prints a coverage report to the terminal. To access a more detailed coverage report, open this file in a browser after running the command below: `./packages/react-components/coverage/lcov-report/index.html` As of now, the reported coverage covers all typescript files of the project, including those that are not supposed to have tests.

```bash
yarn test --coverage
```

### UI Tests

To run the UI test suite, first start the browser example application:

```bash
yarn browser start

```

Then run the UI test suite like so:

```bash
yarn test:browser-app
```

## About ADRs

ADRs are [Architectural Decision Records][adr].

* The `./doc/adr` directory was initialized using `adr-init` based on [adr-tools-python][tools].
* The `adr-new` command (from [adr-tools-python][tools]) is used to add new ADRs further.
* That tool can be installed locally (only once) using [the instructions below](#python-setup).
* The latter also shows how to activate a Python virtual environment to locally run commands.
* These aforementioned `adr-` commands are [meant to be executed from this root directory][tools].
* ADRs should be preferred to [design documents][docs] for their structure and reviewability.
* ADRs should be owned or led in terms of authoring and review; a companion prototype helps.

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

## Release/publish

Publishing this repository's npm packages and creating a corresponding GitHub release with git tag (latest only), all happen on GitHub CI.

### Publish next packages

A set of `next` package is automatically published to `npm` every time a PR is merged.

### Publish latest / release

Whenever a new release is desired, including publishing a corresponding set of `latest` package to `npm`, it can be triggered through a PR. The following has to be done:

Create a new branch for your PR. e.g. 
```bash
git branch new-release && git checkout new-release
```

Then decide if the release shall be a `Major`, `Minor` or `Patch` release and use the corresponding command below to step packages versions, according to the release type. A new release commit will be created:

``` bash
yarn version:major
# or
yarn version:minor
# or
yarn version:patch
```

Modify the _version tag_ in file `./RELEASE`, to match the new release. Then amend the release commit to include this change:

```bash
<edit ./RELEASES to update tag>
git add RELEASE && git commit --amend
```

Finally, push the branch and use it to create a PR. When the PR is merged, a GitHub release should be created with auto-generated release notes, as well as a git tag. Then the `publish-latest` CI job should trigger and if everything goes well, publish the new version of the repo's packages to `npm`.

## License

The code in this repository is licensed under `MIT` (see root `LICENSE`), except for the content of folder `playwright-tests` that's licensed under `EPL-2.0` (see `playwright-tests/LICENSE`). This content is used for testing the components of this repository and is not distributed as part of the various packages that get published to `npm`.

[adr]: https://adr.github.io
[app-image]: https://download.eclipse.org/theia/cdt-cloud/1.45.1/
[cdt-cloud-demo]: https://try.theia-cloud.io/?appDef=cdt-cloud-demo
[cdt-cloud-demo-video]: https://www.youtube.com/watch?v=Yqgu_ysFtnw
[docs]: https://wiki.eclipse.org/Trace_Compass/Design_Documents
[eclipsecon2021-slides]: https://www.eclipsecon.org/sites/default/files/slides/EclipseCon2021-TraceCompassCloud.pdf
[gh]: https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/
[gitpod-ext]: https://gitpod.io/#https://github.com/eclipse-cdt-cloud/theia-trace-extension
[gitpod-live-demo-setup]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/gitpod-live-demo-setup-0.0.2.gif
[gitpod-logo]: https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod
[gitpod-service-ready-notification]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/gitpod-service-ready-notification-0.0.3.PNG
[issues]: https://github.com/eclipse-cdt-cloud/theia-trace-extension/issues
[issue-322]: https://github.com/eclipse-cdt-cloud/theia-trace-extension/issues/322
[npm-viewer-base]: https://www.npmjs.com/package/traceviewer-base
[npm-viewer-react]: https://www.npmjs.com/package/traceviewer-react-components
[npm-viewer]: https://www.npmjs.com/package/theia-traceviewer
[render]: https://github.com/nielsvaneck/render-md-mermaid#render-md-mermaidsh
[image-arch]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-viewer-architecture.PNG
[image-dialog]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-open-trace-dialog.gif
[image-icon]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-icon.png
[image-open-browser]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-open-browser.png
[image-open-view]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-open-view.gif
[image-open-in-trace-viewer]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-open-in-trace-viewer.gif
[image-properties]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-item-properties-0.0.2.png
[image-sidebar]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-open-trace-viewer.gif
[image-viewer]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-0.0.3.png
[image-zoom-buttons]: https://raw.githubusercontent.com/eclipse-cdt-cloud/theia-trace-extension/master/doc/images/theia-trace-extension-toolbar-zoom-buttons.png
[tc-dev-info]: https://wiki.eclipse.org/Trace_Compass
[tc-dev-setup]: https://wiki.eclipse.org/Trace_Compass/Development_Environment_Setup
[tc-gh-label]: https://github.com/eclipse-cdt-cloud/theia-trace-extension/labels/Trace%20Compass
[tc-project]: https://www.eclipse.org/tracecompass/
[tc-server]: https://download.eclipse.org/tracecompass.incubator/trace-server/rcp/?d
[tc-server-build]: https://www.eclipse.org/tracecompass/download.html#trace-server
[tc-server-gh-label]: https://github.com/eclipse-cdt-cloud/theia-trace-extension/labels/Trace%20Server
[tci-code]: https://git.eclipse.org/r/admin/repos/tracecompass.incubator/org.eclipse.tracecompass.incubator
[theia-prereq]: https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites
[theia-webpage]: https://theia-ide.org
[theia-code]: https://github.com/eclipse-theia/theia
[theia-ecosystem]: https://github.com/eclipse-theia
[timeline-chart]: https://github.com/eclipse-cdt-cloud/timeline-chart
[timeline-chart-gh-label]: https://github.com/eclipse-cdt-cloud/theia-trace-extension/labels/timeline-chart
[tools]: https://pypi.org/project/adr-tools-python/
[tracevizlab]: https://github.com/dorsal-lab/Tracevizlab/
[tracevizlab-traces]: https://github.com/dorsal-lab/tracevizlab/blob/master/labs/TraceCompassTutorialTraces.tgz
[tracevizlab-what-file]: https://github.com/dorsal-lab/Tracevizlab/tree/master/labs/001-what-is-tracing
[tracevizlab-what-chapter]: https://github.com/dorsal-lab/Tracevizlab/tree/master/labs/001-what-is-tracing#what-is-tracing
[tracevizlab-when]: https://github.com/dorsal-lab/Tracevizlab/tree/master/labs/001-what-is-tracing#when-to-trace
[tsp]: https://github.com/eclipse-cdt-cloud/trace-server-protocol
[tspc]: https://github.com/eclipse-cdt-cloud/tsp-typescript-client
[tsp-gh-label]: https://github.com/eclipse-cdt-cloud/theia-trace-extension/labels/trace%20server%20protocol
[yarn-issue-2821]: https://github.com/yarnpkg/yarn/issues/2821
[trace-viewer-examples]: https://github.com/eclipse-cdt-cloud/trace-viewer-examples
