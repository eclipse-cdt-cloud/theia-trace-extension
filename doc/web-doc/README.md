# Documentation framework for Theia Trace Extension

## Installation

Requirements: NodeJS on the same version as the one required for [Theia IDE][theia-prereq].

```bash
cd doc/web-doc
yarn
```

> Executing `yarn` from the root of `theia-trace-extension` does not install the dependencies in `doc/web-doc`. The configuration for Lerna to support such a feature may be added in the future.

Run site

```bash
yarn dev
```

Or start the server and open the app in a new browser tab

```bash
yarn dev --open
```

The site will be running at [localhost, port 5173].

## Development

Run Prettier from the root of the web-doc project (at `doc/web-doc/` from the root of `theia-trace-extension`) using the following commands:

To check code style:

```bash
yarn lint
```

To fix code style:

```bash
yarn format
```

Website created with [SvelteKit].

[theia-prereq]: https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites
[sveltekit]: https://kit.svelte.dev
[localhost, port 5173]: http://localhost:5173
