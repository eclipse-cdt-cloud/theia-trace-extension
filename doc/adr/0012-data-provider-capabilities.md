# 12. Data provider capabilities

Date: 2024-11-25

## Status

Proposed

## Context

Currently, data providers are described through the `OutputDescriptor`. It defines a provider `type` to indicate which graph it can provide data to. However, it's not known when a data provider can create derived data providers or if a data provider can delete itself. See [TSP Analysis API](0012-tsp-analysis-api.md) to create and delete derived data providers.

`Capabilities` shall be added that indicate what other capabilities a data provider has beyond providing data for widgets whose data structure are defined in the `trace server protocol`.

`Capabilities` will allow front-ends to create user interfaces, e.g. a button to create or delete a data provider (e.g. canCreate, canDelete).

```javascript
    OutputDescriptor {
        id: string,
        name: string,
        description: string,
        type: string, // provider type
        parentId?: string
        configuration: Configuration
        capabilities: {
            canCreate: boolean,
            canDelete: boolean
    }

    Configuration {
        id: string;
        name: string;
        description?: string;
        sourceTypeId: string;
        parameters?: Record<string, any>; // custom parameters
    }
```

|Capability|Description|
|:---------|:----------|
|`capabilities.canCreate`| Whether the output can create derived data providers.</br>If it is set to `true`, front-end clients can query the following endpoint to all supported `configuration source types`<pre>GET /experiments/{expUUID}/outputs/{outputId}/configTypes/</pre></br>The returned `configuration source types` will contain description which parameter needs to be provided when creating a derived data provider with the following endpoint<pre>POST /experiments/{expUUID}/outputs/{outputId}/</pre>| 
|`capabilities.canDelete`| Whether the output can be deleted.</br> Use the following end-point to delete the derived data provider and its configuration <pre> DELETE /experiments/{expUUID}/outputs/{outputId}/{derivedId}/</pre> where `outputId` is the parentId and `derivedId` is the ID of this output|

Where the `ConfigurationSourceType` is defined as below. For example, a JSON schema can be used to describe custom parameters required for creation of derived outputs.

```javascript
    ConfigurationSourceType {
        id: string;
        name: string;
        description?: string;
        parameterDescriptors?: ConfigurationParameterDescriptor[];
        schema?: object;
    }
```

See the [Trace Server Protocol (TSP) specification][tsp-spec] to get more details about the endpoints and data strucutres

## Future considerations

More capabilities can be added in the future to achieve other server-side features. The capabilities concept can be applied to other areas of the TSP, e.g. experiments.

## Decision

The change that we're proposing or have agreed to implement, will be implemented.

## Consequences

### Easier to do

With this change it's easier to know when a output can create derived data providers or a data provder can be deleted, and as a consequence, it will be easier to provide UI controls (e.g. button or menu) to create or delete derived data providers. The name of the control can be taken from the capability directly, e.g. for `canDelete` a menu item with label `Delete` can be added. This will improve the overall user experience of the  front-end user interface (UI).

### More difficult

Without capabilities, all data providers need query the endpoint to get configTypes to know if a data provider can create derived data providers. Without the delete capabilities, it's not possible to know that a data provider can be deleted and hence, the front-end UI has to enable a delete menu item for all data providers and the trace server will reject if deletion is not possible.

### Risks introduced

No risks are introduced with capabilities.


[tsp-spec]: https://eclipse-cdt-cloud.github.io/trace-server-protocol/