# Example docker image for theia-trace-extension

This folder contains an example showing how to create a docker image
for theia-trace-extension front-end.

Notes:

- the image will contain exclusively the theia-trace-extension front-end.
  If you want to run a complete application, you will need a service
  running the trace-server (not included here);

- the image will be built using the latest [npm package] of the
  theia-trace-extension, and not the code in this repo;

- the *example-package.json* file is not named *package.json* because
  at the time this change was proposed building the theia-trace-extension
  application from the source of this repo looked recursively to all
  package.json in the project, and we wanted to avoid pollution of the
  main project lockfile when building;

## How to build and run

Build the image and name it *tte*:

```bash
docker build -t tte .
```

Once the image has been built, start a container named *tte-1* from
the *tte* image:

```bash
docker run --name tte-1 tte
```

Find the IP address of the *tte-1* container:

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' tte-1
```

Connect to port `4000` of the IP identified earlier using your browser.
You should be able to see the theia-trace-extension UI.

## Connect to a trace-server

Let's say you have another container running the trace-server at
IP 172.17.0.2, port `8080`. You can launch the *tte-1* container and
connect it to the trace-server using the following command:

```bash
docker run --name tte-1 --network="host" -e TRACE_SERVER_URL=172.17.0.2:8080/tsp/api tte
```

[npm package]: https://www.npmjs.com/package/theia-traceviewer
