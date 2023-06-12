# Contributing to Trace Viewer extension

Thanks for your interest in the [Trace Viewer extension][trace-viewer]! The following is a set of
guidelines for contributing to the Trace Viewer extension for Theia applications.

## How to Contribute

⚠️ **Important note** Setting up the development environment on Linux is the easiest. If you are trying
to run the project on Windows or MacOs and you are encountering issues, please [contact us][contact-us].

In order to contribute, please first [open an issue][issues] that clearly describes the bug you
intend to fix or the feature you would like to add. Make sure you provide a way to reproduce the bug
or test the proposed feature.

Once you have your code ready for review, please  [open a pull request][pull-requests]. Please follow
the [pull request guidelines][pr-guide]. If you are new to the project, the
[new contributors][new-contributors] section provides useful information to get you started. A
committer of the Trace Extension will then review your contribution and help to get it merged.

## Code of Conduct

This project is governed by the [Eclipse Community Code of Conduct][code-of-conduct].
By participating, you are expected to uphold this code.

## Eclipse Development Process

This Eclipse Foundation open project is governed by the [Eclipse Foundation
Development Process][dev-process] and operates under the terms of the [Eclipse IP Policy][ip-policy].

## Eclipse Contributor Agreement

In order to be able to contribute to Eclipse Foundation projects you must
electronically sign the [Eclipse Contributor Agreement (ECA)][eca].

The ECA provides the Eclipse Foundation with a permanent record that you agree
that each of your contributions will comply with the commitments documented in
the Developer Certificate of Origin (DCO). Having an ECA on file associated with
the email address matching the "Author" field of your contribution's Git commits
fulfills the DCO's requirement that you sign-off on your contributions.

For more information, please see the [Eclipse Committer Handbook][commiter-handbook].

## Pull request guidelines

**Changes to the project** are made by submitting code with a pull request (PR).

* [How to write and submit changes][creating-changes]
* [Example pull request][issue-402]

**Good commit messages** make it easier to review code and understand why the changes were made.
Please include a:

* *Title:* Concise and complete title written in imperative (e.g. "Update Gitpod demo screenshots"
or "Single-click to select or open trace")
* *Problem:* What is the situation that needs to be resolved? Why does the problem need fixing?
Link to related issues (e.g. "Fixes [#317][issue-317]").
* *Solution:* What changes were made to resolve the situation? Why are these changes the right fix?
* *Impact:* What impact do these changes have? (e.g. Numbers to show a performance improvement,
screenshots or a video for a UI change)
* [*Sign-off:*][sign-off] Use your full name and a long-term email address. This certifies that you
have written the code and that, from a licensing perspective, the code is appropriate for use in open-source.

Other commit information:

* [How to format the message][commit-message-message]
* [Example commit message][commit-message-example]

## New contributors

### Explore the project context

* **Check out the [tracevizlabs][tracevizlab].** You don't need to complete all of them, but reading
 a couple is good for context. Lab sets 0 and 1 are especially useful.
* **Browse recent conference presentations.** They give an overview of the trace viewer's goals,
[architecture][architecture], and functionality.
  * *Trace Compass Cloud: Eclipse Trace Compass's migration towards Theia*, [slides][tracompa-cloud-slides],
  [video][tracompa-cloud-video] - Bernd Hufmann, Ericsson AB (EclipseCon 2021)
  * *Using Theia to take trace analysis and visualization to the next level*, [slides][tracing-with-theia-slides],
  [video][tracing-with-theia-video] - Bernd Hufmann, Ericsson AB (EclipseCon 2019)
  * *A New Flexible Architecture for Trace Compass*, [slides][flexible-architecture-slides],
  [video][flexible-architecture-video] - Michel Dagenais, Polytechnique Montréal ([Tracing Summit 2019][tracing-summit])
* **Get an [overview of external components][external-components]** used by this trace viewer. See how they interact.

### Start with a small change

* **Explore the [Gitpod demo][gitpod-demo].** Experiment with the trace viewer. Start exploring
its code via Gitpod's in-browser IDE.
* **Start with a small frontend improvement.** A relevant change can be [less than 5 lines of code][issue-369].
The Theia-based frontend repo is much less complex than the Trace Server's, so by starting in the frontend
you'll learn high-level context about the project's different components without being overwhelmed with complexity.
  * [Good first issues][good-first-issues]
  * *Develop with Gitpod to initially avoid dev setup.* Put `gitpod.io/#` before your project fork's GitHub URL
  to open an in-browser IDE and initially avoid any local dev setup. This dev approach works best for small changes
  because Gitpod workspaces are volatile.
  * *Learn [how to contribute code][pr-guide].* Starting with a tiny change means you can first focus on exploring
  the code as well as learning the submission and review process (which is a significant learning step if you've
  never submitted a PR before).

## Uplifting the Theia dependencies version

Should one be willing to contribute such an uplift, these are the steps to consider, while
more may be necessary depending on the case. Here is an example used to uplift from version
`1.34.1` to `1.34.2`:

1. `cd theia` or go to the Theia repository using a local terminal.
1. `git fetch && git tag` can be used to explore the latest released version tags.
1. `git diff v1.34.1-community v1.34.2 CHANGELOG.md` (e.g.).
   * To assess if any change may break the extension.
   * If any breaking change, then consider it before uplifting; then, continue.
1. `git diff v1.34.1-community v1.34.2` (adding `--name-only` first if need be).
   * To assess if any noteworthy dependency versions were bumped since the previous uplift.
   * Some bumps may then be required also in the extension; consider applying them.
1. Uplift the version of each `@theia/` dependency in these `package.json` files, from `1.34.1` to `1.34.2` (replacing the former with the latter):
   * `./examples/browser/package.json`
   * `./examples/docker/example-package.json`
   * `./examples/electron/package.json`
   * `./package.json`
   * `./theia-extensions/viewer-prototype/package.json`
1. Align these React dependency versions in `./package.json` with Theia's `packages/core/package.json`, when applicable:
   * `"react"`
   * `"react-dom"`
   * `"@types/react"`
   * `"@types/react-dom"`
1. Do the same also for `react-test-renderer` in `packages/react-components/package.json`, and potentially elsewhere in the extension.
1. Align `node-version` in `.github/workflows` yaml files with Theia's.
   * Referring also to Theia's `"node"` and `@types/node` versions in its root `package.json` file.

## Formatting code with Prettier

If a commit fails to pass CI checks because of its format, contributors can use Prettier, which is already conveniently set up in the project,
to quickly format their commit.

* To format a single file, simply run `yarn prettier --write <path-to-file>`.
* To run Prettier on all source code files, run `yarn format:write`. Prettier will only format files that are not formatted correctly.
* To check if new changes comply with Prettier rules, run `yarn prettier --check <path-to-file>` or `yarn format:check` to perform the check on a single file
  or all source code file, respectively.

## Ignoring linting/formatting commits

Should one be needing to use `git blame` to view the changes that were made recently to a file, it might be necessary to
ignore the changes that were made in linting/formatting commits. In the root of the repo, there is a `.git-blame-ignore-revs`
file. Adding the SHA-1 of a commit to this file will make `git-blame` ignore that commit. To use this file:

* For GitHub, this file is automatically detected and will ignore all the commits that are included in the file.
* With Git CLI, run `git blame --ignore-revs-file=.git-blame-ignore-revs <pathToSomeFile>` to ignore the commits.

## Releasing a new version

* Run either one of the below repository root commands, depending on the case at hand.
* Below, `Z` means `z+1`, and the same notation is used for `x` and `y`.

For a release bumping the version from `x.y.z` to `x.y.Z`:

```bash
yarn version:patch
```

For a release bumping the version from `x.y.z` to `x.Y.z`:

```bash
yarn version:minor
```

For a release bumping the version from `x.y.z` to `X.y.z`:

```bash
yarn version:major
```

Currently, [automatically adding][auto-signoff] a [Signed-off-by:][sign-off] footer to the
resulting commit message fails for this `lerna` use with `yarn`. Should one be necessary,
the commit needs to be amended accordingly, using `git commit --amend -s` or the like.

Once pushed, reviewed then merged, the resulting commit triggers the GitHub workflow that
publishes this new release to [the npm Registry][npm-registry]. That action shall also push
the corresponding git tag. The locally created tag (internally by `lerna version`) should
then be overridable by that remote one.

Should there be an issue with that automated workflow, the said local tag can be manually
pushed, once the commit is merged and [published as latest release][npm-registry]. If need
be, the latter step can also be done manually by running this repository root command:

```bash
yarn && yarn publish:latest`
```

If needed, this is a command template to push the tag after publishing per above:

```bash
git push origin vX.Y.Z
```

Where either one of `X`, `Y` or `Z` was bumped depending on the chosen case further above.

## Contact

For issues related to the Trace Viewer, please open a GitHub tracker for the [Theia Trace Extension][trace-viewer].

For issues concerning `eclipse-cdt-cloud`, please refer to the contact options listed on the [CDT.Cloud website][cdt-cloud-website].

[architecture]: https://github.com/theia-ide/theia-trace-extension#architecture
[auto-signoff]: https://github.com/lerna/lerna/blob/main/libs/commands/version/README.md#--signoff-git-commit
[cdt-cloud-website]: https://cdt-cloud.io/contact/
[code-of-conduct]: https://github.com/eclipse/.github/blob/master/CODE_OF_CONDUCT.md
[commit-message-example]: https://github.com/theia-ide/theia-trace-extension/commit/bc18fcd110d7b8433293692421f2e4fb49f89bd6
[commit-message-message]: https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html
[commiter-handbook]: https://www.eclipse.org/projects/handbook/#resources-commit
[contact-us]: #contact
[creating-changes]: https://www.dataschool.io/how-to-contribute-on-github/
[dev-process]: https://eclipse.org/projects/dev_process
[eca]: http://www.eclipse.org/legal/ECA.php
[external-components]: https://github.com/theia-ide/theia-trace-extension#related-code
[good-first-issues]: https://github.com/theia-ide/theia-trace-extension/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
[flexible-architecture-video]: https://www.youtube.com/watch?v=8s5vGf45e-g
[flexible-architecture-slides]: https://tracingsummit.org/ts/2019/files/Tracingsummit2019-theia-dagenais.pdf
[gitpod-demo]: https://github.com/theia-ide/theia-trace-extension#try-a-live-demo-via-gitpod
[ip-policy]: https://www.eclipse.org/org/documents/Eclipse_IP_Policy.pdf
[issues]: https://github.com/eclipse-cdt-cloud/theia-trace-extension/issues
[issue-317]: https://github.com/theia-ide/theia-trace-extension/issues/317
[issue-369]: https://github.com/theia-ide/theia-trace-extension/pull/369/files
[issue-402]: https://github.com/theia-ide/theia-trace-extension/pull/402
[new-contributors]: #new-contributors
[npm-registry]: https://www.npmjs.com/
[pr-guide]: #pull-request-guidelines
[pull-requests]: https://github.com/eclipse-cdt-cloud/theia-trace-extension/pulls
[sign-off]: https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---signoff
[trace-viewer]: https://github.com/eclipse-cdt-cloud/theia-trace-extension
[tracevizlab]: https://github.com/dorsal-lab/Tracevizlab
[tracing-with-theia-video]: https://www.youtube.com/watch?v=Fysg1mOadik
[tracing-with-theia-slides]: https://www.eclipsecon.org/sites/default/files/slides/EclipseConEurope2019-TraceCompass-Theia.pdf
[tracing-summit]: https://tracingsummit.org/ts/2019/
[tracompa-cloud-video]: https://www.youtube.com/watch?v=DFxWXE4A-uQ
[tracompa-cloud-slides]: https://www.eclipsecon.org/sites/default/files/slides/EclipseCon2021-TraceCompassCloud.pdf
