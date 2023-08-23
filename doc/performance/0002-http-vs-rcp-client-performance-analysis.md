# Comparison of the performance of TSPClient before and after JSON-RPC implementation

## Context

By default the Theia extension and the React components do not communicate with the Trace Compass server via the Theia backend, but rather connect to a separate exposed port (e.g. 8080) via REST. This approach has some downsides. For example in cloud deployments the additional port needs to be exposed as well. The full description of the issue can be found in [issue #976](https://github.com/eclipse-cdt-cloud/theia-trace-extension/issues/976).

Visually, the current implementation is:

```text
Theia FE <--TSP over HTTP--> Trace Server
```

[Pull request #990](https://github.com/eclipse-cdt-cloud/theia-trace-extension/pull/990) proposes the following solution for issue #976:

```text
Theia FE <--msgpackr(previously was JSON-RPC)--> Theia BE <--TSP over HTTP--> Trace Server
```

Instead of communicating with the Trace Server directly from the front-end, the proposed solution will have the front-end (Theia FE) send its HTTP requests to the Theia Back-end (Theia BE). Then, the BE will perform the HTTP request and return the response to the FE.

It is important to note that, previously, Theia used `JSON-RPC` to serialize data for its FE-BE communication. However, recently, it has opted for a more performant standard called `message pack`. Theia now uses `msgpackr` (an implementation of message pack). More information regarding this decision, as well as some benchmarking statistics, can be found [here](https://github.com/eclipse-theia/theia/issues/11159). This change is done since Theia version `1.29.0`. The tests below are done with Theia version `1.37.2`. In the code, the connection handler is still named `JsonRpcConnectionHandler`, although Theia will default to using `msgpackr`. Hence, in this documentation, I use `JSON-RPC` and `msgpackr` interchangeably, to refer to the changes made in PR #990.

The goal of this document is to compare the performance of the Trace Extension before and after PR #990. Since we have an additional link in the communication chain, it is expected that the communication time will either be the same or increased. We would like to know the magnitude of this increased, and how it affects the performance of the Theia Trace Extension in general.

## Test specs

### Setup

```text
                                ..,
                    ....,,:;+ccllll   -------------------------------
      ...,,+:;  cllllllllllllllllll   OS: Windows 10 Pro x86_64
,cclllllllllll  lllllllllllllllllll   Host: Dell Inc. Latitude 5420
llllllllllllll  lllllllllllllllllll   Kernel: 10.0.19044
llllllllllllll  lllllllllllllllllll   Uptime: 4 days, 22 hours, 21 mins
llllllllllllll  lllllllllllllllllll   Packages: 4 (scoop)
llllllllllllll  lllllllllllllllllll   Shell: bash 4.4.23
llllllllllllll  lllllllllllllllllll   Resolution: 1920x1080, 1920x1080
                                      DE: Aero
llllllllllllll  lllllllllllllllllll   WM: Explorer
llllllllllllll  lllllllllllllllllll   WM Theme: Custom
llllllllllllll  lllllllllllllllllll   CPU: 11th Gen Intel i5-1145G7 (8) @ 1.500GHz
llllllllllllll  lllllllllllllllllll   GPU: Caption
llllllllllllll  lllllllllllllllllll   GPU: Intel(R) Iris(R) Xe Graphics
`'ccllllllllll  lllllllllllllllllll   GPU: Citrix Indirect Display Adapter
       `' \*::  :ccllllllllllllllll   GPU
                       ````''*::cll   Memory: 24368MiB / 32145MiB
                        ``
```

Theia version: 1.37.2 (have to be at least 1.29.0).

For all logs to appear in the debug console in visual studio code, make sure that the Browser FE and Theia BE is ran in debug mode.

Also, to add logs to the TSPClient, you need to clone the `tsp-typescript-client` repo and link it to the Theia Trace extension.

### Benchmarking criteria

To benchmark the performance of the Trace Extension before and after PR #990, timestamps are logged to the debug console of VSCode. There are 4 timestamps to be logged (in order of execution):

1. The timestamp when we initiate the communication to the TSPClient (e.g when the FE calls the TSPClient).
2. The timestamp when we reach the TSPClient object. In the case of JSON-RPC, 
3. The timestamp when HTTP requests are finished
4. The timestamp when we receive the data back from the TSPClient

Then, the following statistics is calculated:

1. TSPClient processing time (ms): The time took to generate, send and receive response for an HTTP request. This is the time from when the TSPClient is reached until the result is ready to be returned to the FE.
2. Front-end to TSPClient (ms): The time to reach the TSPClient from the Theia FE. In the current implementation, this value is expected to be negligible since the TSPClient is accessed directly by the FE. However, in the JSON-RPC implementation, some latency is expected since now the TSPClient is on the Theia BE.
3. TSPClient to Front-end (ms): The time took to return the HTTP response data from the BE to the FE. Same as [2], some latency is expected for the JSON-RPC implementation.
4. Total duration: The total time took to send an HTTP request and receive response from the TSPClient. In the JSON-RPC implementation, this includes communication time with the Theia BE.
5. Overhead: The time added by adding the Theia BE to the communication chain.

Then, the median, average, max and min value for each category is calculated to compare the performance pre and post JSON-RPC.

### Test cases

This benchmarking attempt measures the performance of 3 operations, before and after the JSON-RPC patch. Each test case below are run 15 times on the current implementation and on the JSON-RPC patch:

1. tspClient.experimentOutputs(): Get the available outputs for a specific trace.

```text
Test 1
Params: experiment ID
Returns: an array of OutputDescriptors

Steps:
1. Open the Theia Trace extension in a browser.
2. Open a trace using the trace explorer on the left. The available views section on the left side should be populated.
3. Check the debug console and record the numbers.
```

2. tspClient.fetchXYTree(): Get the filter tree for the left side view of an XY chart.

```text
Test 2
Params: experiment ID, output ID, and time range parameters
Returns: the model of XY trees

Steps:
1. Open the Theia Trace extension in a browser.
2. Open a trace. The available views section on the left side should be populated.
3. Open the histogram view.
4. Check the debug console and record the numbers.
```

3. tspClient.fetchTimeGraphStates(): Fetch the states for a flame chart. 2 separate test cases are done for this function.

```text

Params: experiment ID, output ID, and time range parameters
Returns: the time graph model

Test 3a
Steps:
1. Open the Theia Trace extension in a browser.
2. Open a trace that has the Flame Chart output. 
3. The flame chart should be opened and populated.
4. Check the debug console and record the numbers.

Test 3b
Steps:
1. Open the Theia Trace extension in a browser.
2. Open a trace that has the Flame Chart output. 
3. The flame chart should be opened and populated.
4. Clear the console. This is to make sure that the right numbers are recorded.
5. Perform a zoom with the right mouse button.
6. Check the debug console and record the numbers.
```

The trace used for this benchmarking attempt can be found [here](https://github.com/eclipse-cdt-cloud/theia-trace-extension/pull/923).

The zoom range used for test 3b is [1673902684.0-1673902684.5] (with the trace above).

**Why do we need 2 tests?**

In test 3a, the function `tspClient.fetchTimeGraphStates()` is executed, but there are some latency to reach the TSPClient because multiple requests are launched to load the chart. Hence, in test 3b, the measurement to reach the TSPClient is more accurate since there are no interfering processes. Also, in test 3b, there are around `116620 states` to be fetched from the server. This is to measure if the latency added by JSON-RPC correlates to the size of the HTTP response.

### Test code

#### getAvailableOutputs

```typescript
// In the Theia Trace Extension repo
// In experiment-manager.ts
async getAvailableOutputs(experimentUUID: string): Promise<OutputDescriptor[] | undefined> {
    // Save the timestamp when we initiate the communication to the TSPClient
    const start = Date.now(); 
    const outputsResponse = await this.fTspClient.experimentOutputs(experimentUUID);
    // Save the timestamp when we receive the data back from the TSPClient
    const end = Date.now();
    // Output the timestamps to the debug console
    console.log('Theia FE:: getAvailableOutputs:: start: ', start, ', end::', end);
    if (outputsResponse && outputsResponse.isOk()) {
        return outputsResponse.getModel();
    }
    return undefined;
}

// In the tsp-typescript-client repo
// In tsp-client.ts
public async experimentOutputs(
        expUUID: string
): Promise<TspClientResponse<OutputDescriptor[]>> {
    // Save the timestamp when the TSPClient is reached
    const start = Date.now();
    const url = this.baseUrl + "/experiments/" + expUUID + "/outputs";
    // Store the result in the variable to save a timestamp before returning
    const result = await RestClient.get(url, undefined, array(OutputDescriptor));
    // Save the timestamp when the HTTP request is finished
    const end = Date.now();
    // Output the timestamps to the debug console
    console.log('TSPClient:: getAvailableOutputs:: client reached:', start, ', Promised resolved:', end);
    return result;
}
```

#### fetchXYTree

```typescript
// In the Theia Trace Extension repo
// In abstract-xy-output-component.tsx
async fetchTree(): Promise<ResponseStatus> {
    this.viewSpinner(true);
    const parameters = QueryHelper.timeRangeQuery(this.props.range.getStart(), this.props.range.getEnd());
    // Save the timestamp when we initiate the communication to the TSPClient
    const start = Date.now();
    const tspClientResponse = await this.props.tspClient.fetchXYTree(
        this.props.traceId,
        this.props.outputDescriptor.id,
        parameters
    );
    // Save the timestamp when we receive the data back from the TSPClient
    const end = Date.now();
    // Output the timestamps to the debug console
    console.log('Theia FE:: fetchXYTree:: start: ', start, ', end::', end);
    ... // Rest of code
}

// In the tsp-typescript-client repo
// In tsp-client.ts
public async fetchXYTree(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<EntryModel<XyEntry>>>> {
    // Save the timestamp when the TSPClient is reached
    const start = Date.now();
    const url =
        this.baseUrl +
        "/experiments/" +
        expUUID +
        "/outputs/XY/" +
        outputID +
        "/tree";
    // Await for the result instead of returning it right away
    const result = await RestClient.post(
        url,
        parameters,
        GenericResponse(EntryModel(Entry))
    );
    // Save the timestamp when the HTTP request is finished
    const end = Date.now();
    // Output the timestamps to the debug console
    console.log('TSPClient:: fetchXYTree:: client reached:', start, ', Promised resolved:', end);
    return result;
}

```

#### fetchTimeGraphStates

Due to the different implementation of the TSPClient in each version, the test code is slightly different for each implementation.

The following test code applies for both implementations:

```typescript
/**
 * JSON-RPC implementation test codes
 **/

// In the Theia Trace Extension repo
async getData(
        ids: number[],
        entries: TimeGraphEntry[],
        totalTimeRange: TimeRange,
        worldRange?: TimelineChart.TimeGraphRange,
        nbTimes?: number,
        annotationMarkers?: string[],
        markerSetId?: string
    ): Promise<TimelineChart.TimeGraphModel> {
    ... // Some code

    // Fire all TSP requests
    this.totalRange = totalTimeRange.getEnd() - totalTimeRange.getStart();
    const start = totalTimeRange.getStart() + worldRange.start;
    const end = totalTimeRange.getStart() + worldRange.end;
    const timeGraphStateParams = QueryHelper.selectionTimeRangeQuery(start, end, nbTimes, ids);

    // Start of test code block - This is ADDED code
    // Save the timestamp when we initiate the communication to the TSPClient
    const startX = Date.now();
    const result = await this.client.fetchTimeGraphStates(this.traceUUID, this.outputId, timeGraphStateParams, true);
    // Save the timestamp when we receive the data back from the TSPClient
    const endX = Date.now();
    // Output the timestamps to the debug console
     console.log('Theia FE:: fetchTimeGraphStates:: start: ', startX, ', end::', endX);
    // End of test code block

    const statesPromise = this.client.fetchTimeGraphStates(this.traceUUID, this.outputId, timeGraphStateParams);

    ... // Remaining code
}

// In the tsp-typescript-client repo
/**
 * In order to obtain accurate logs for this function, we need to add a new parameter to determine
 * which call of the function should output logs. We only want to output the logs for the test code
 * added previously in the the theia-trace-extension repo.
 */
// In tsp-client.ts
fetchTimeGraphStates(
    expUUID: string,
    outputID: string,
    parameters: Query,
    isTest?: boolean // Added filtering parameter
): Promise<TspClientResponse<GenericResponse<TimeGraphModel>>>;

// In tsp-data-provider.ts
public async fetchTimeGraphStates(
        expUUID: string,
        outputID: string,
        parameters: Query,
        isTest?: boolean // Added filtering parameter
    ): Promise<TspClientResponse<GenericResponse<TimeGraphModel>>> {
    // Save the timestamp when the TSPClient is reached
    const start = Date.now();
    const url =
        this.baseUrl +
        "/experiments/" +
        expUUID +
        "/outputs/timeGraph/" +
        outputID +
        "/states";
    // Await for the result instead of returning it right away
    const result = await RestClient.post(
        url,
        parameters,
        GenericResponse(TimeGraphModel)
    );
    // Save the timestamp when the HTTP request is finished
    const end = Date.now();

    // We need the condition here to filter the logs
    if(isTest){
        console.log('TSPClient:: fetchTimeGraphStates:: client reached:', start, ', Promised resolved:', end);
    }

    return result;
}
```

In the `JSON-RPC implementation`, we also need to modify:

```typescript
// In the Theia Trace Extension repo
// In tsp-frontend-client-impl.ts
public async fetchTimeGraphStates(
    expUUID: string,
    outputID: string,
    parameters: Query,
    isTest?: boolean // Added filtering parameter
): Promise<TspClientResponse<GenericResponse<TimeGraphModel>>> {
    return this.toTspClientResponse<GenericResponse<TimeGraphModel>>(
        await this.tspClient.fetchTimeGraphStates(expUUID, outputID, parameters, isTest) // Pass it to the TspClient
    );
}
```

## Results

### Get output descriptors

|         | TSPClient processing time (ms) |          | Front-end to TSPClient (ms) |          | TSPClient to Front-end (ms) |          | Total duration (ms) |          | Overhead |
| ------- | ------------------------------ | -------- | --------------------------- | -------- | --------------------------- | -------- | ------------------- | -------- | -------- |
|         | Current                        | JSON-RPC | Current                     | JSON-RPC | Current                     | JSON-RPC | Current             | JSON-RPC | JSON-RPC |
| Median  | 29                             | 5        | 16                          | 13       | 0                           | 19       | 48                  | 41       | 36       |
| Average | 30                             | 4.8      | 19                          | 20.2     | 0                           | 19.1     | 49                  | 44.1     | 39.3     |
| Max     | 43                             | 8        | 35                          | 39       | 1                           | 23       | 70                  | 62       | 56       |
| Min     | 16                             | 3        | 8                           | 11       | 0                           | 13       | 26                  | 28       | 24       |

### Fetch XY tree

|         | TSPClient processing time (ms) |          | Front-end to TSPClient (ms) |          | TSPClient to Front-end (ms) |          | Total duration (ms) |          | Overhead |
| ------- | ------------------------------ | -------- | --------------------------- | -------- | --------------------------- | -------- | ------------------- | -------- | -------- |
|         | Current                        | JSON-RPC | Current                     | JSON-RPC | Current                     | JSON-RPC | Current             | JSON-RPC | JSON-RPC |
| Median  | 71                             | 10       | 39                          | 40       | 0                           | 52       | 107                 | 102      | 92       |
| Average | 81                             | 9.9      | 43                          | 42       | 0                           | 51.4     | 124                 | 103.3    | 93.4     |
| Max     | 217                            | 12       | 91                          | 53       | 1                           | 62       | 308                 | 121      | 109      |
| Min     | 55                             | 8        | 36                          | 37       | 0                           | 40       | 99                  | 88       | 78       |

### Fetch time graph states

#### First attempt, with a smaller return payload

|         | TSPClient processing time (ms) |          | Front-end to TSPClient (ms) |          | TSPClient to Front-end (ms) |          | Total duration (ms) |          | Overhead |
| ------- | ------------------------------ | -------- | --------------------------- | -------- | --------------------------- | -------- | ------------------- | -------- | -------- |
|         | Current                        | JSON-RPC | Current                     | JSON-RPC | Current                     | JSON-RPC | Current             | JSON-RPC | JSON-RPC |
| Median  | 111                            | 45       | 48                          | 49       | 0                           | 44       | 160                 | 141      | 93       |
| Average | 139                            | 45.9     | 45                          | 46.4     | 0                           | 37.5     | 185                 | 129.9    | 83.9     |
| Max     | 462                            | 64       | 52                          | 56       | 1                           | 62       | 506                 | 155      | 115      |
| Min     | 96                             | 38       | 32                          | 37       | 0                           | 19       | 130                 | 96       | 56       |

#### Second attempt, with a larger return payload

|         | TSPClient processing time (ms) |          | Front-end to TSPClient (ms) |          | TSPClient to Front-end (ms) |          | Total duration (ms) |          | Overhead |
| ------- | ------------------------------ | -------- | --------------------------- | -------- | --------------------------- | -------- | ------------------- | -------- | -------- |
|         | Current                        | JSON-RPC | Current                     | JSON-RPC | Current                     | JSON-RPC | Current             | JSON-RPC | JSON-RPC |
| Median  | 1346                           | 753      | 0                           | 2        | 0                           | 97       | 1347                | 852      | 99       |
| Average | 1339                           | 765.3    | 0                           | 2.1      | 0                           | 103.3    | 1339                | 870.7    | 105.4    |
| Max     | 1713                           | 830      | 1                           | 3        | 1                           | 149      | 1714                | 936      | 152      |
| Min     | 877                            | 719      | 0                           | 1        | 0                           | 69       | 877                 | 807      | 72       |

## Analysis

### TSPClient processing time

In all examples, the TSPClient processing time of the current implementation is much slower compared to the JSON-RPC implementation. The reason is that, in the case of JSON-RPC, the TSPClient code is ran in NodeJS, instead of the browser. NodeJS uses the v8 compiler, which is a JIT compiler which [optimizes code performance](https://blog.bitsrc.io/the-jit-in-javascript-just-in-time-compiler-798b66e44143). In addition, the Theia BE uses a zero copy serializer for its BE-Trace Server communication. Hence, the TSPClient runs a lot faster on the Theia BE. From the numbers that we have, the speed of the TSPClient improves at least `2 times` and can be up to `9 times` when running in the BE.

### Front-end to TSPClient

In all test cases, the time takes to reach the TSPClient from the Theia FE is pretty similar. In the first 3 test cases (1, 2, and 3a), it is inconclusive to say that there is a significant difference in speed. In test case 3b, by removing other factors such as parallel running HTTP requests, the time takes to reach the TSPClient in the JSON-RPC implementation is only `2ms` more than the current implementation, which is not really significant. However, payloads going to the Theia BE test here is small. Larger parameters might contribute more latency. However, we don't expect the request payload to become extremely large, such as the case of the response payload.

### TSPClient to Front-end

In all test cases, there is virtually no latency for returning the HTTP response to the front-end in the current implementation. However, there is significant latency when using JSON-RPC. Latency scales with the size of the response. The larger the response is, the longer the latency. When getting out descriptors, where we get a small response payload, the latency added is approximately `50ms`. In test case 3b, where we fetch around `116620 states`, latency can be `150ms`.

### Total duration

Surprisingly, overall, using JSON-RPC can improve the performance of the Trace Extension. The reason is that the performance gain in the TSPClient processing speed over-compensates for the latency added by JSON-RPC. In all test cases, the JSON-RPC implementation either performs the same as the current implementation (test case 1, 2) or improves the processing speed `up to 1.5 times` (test case 3b). That is a 50% performance gain.

## Conclusion

The implementation of JSON-RPC results in a gain in performance since the performance gained by the TSPClient. Its benefit outweighs the latency added by adding the Theia BE layer in the communication chain.
