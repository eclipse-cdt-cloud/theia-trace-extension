# Contributing to traceviewer libraries

Thanks for your interest! If you are currently looking at a repository named traceviewer-libs, this is probably not the best place to contribute to the contained libraries. The libraries in this repository were split (using git subtree split ...) from their original "home", the `eclipse-cdt-cloud/theia-trace-extension` repository. 

The goal was then to add this repo as a subtree in the product(s) that depend on the traceviewer libraries, so they can be developed, modified and tweaked locally, in-place. One such product/repo is `eclipse-cdt-cloud/vscode-trace-extension`, where you can find them under root folder `local-libs/traceviewer-libs`. If your ultimate goal is to contribute to the `Trace viewer for VSCode extension`, that's where you should make your contribution. 

Periodically, the project's maintainers will push local contributions to the shared subtree repository, making them available to other products that have adopted it. 

