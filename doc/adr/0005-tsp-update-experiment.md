# 5. Tsp update experiment

Date: 2022-03-22

## Status

Proposed

## Context

The tentative [TSP specification][tsp] proposes a PUT command on the `tsp/api/experiments/{expUUID}` endpoint for the following use cases:

- Rename experiment
- Add/remove traces to/from an experiment
- Other updates (e.g. offsetting of traces)

When an experiment is created the client passes the `name` of the experiment and a `list of trace UUIDs` to the POST request.
It returns a data structure with experiment details and a `unique UUID`, to identify the experiment.

This ADR proposes the way-forward for renaming and adding/removing of traces of experiments. It doesn't cover other updates like offsetting of traces. They will be handled in other ADRs.

PUT commands require to be idempotent, multiple requests have to have the same outcome. For a PUT to be idempotent, it is required to provide all parameters that make up an experiment to be sent in the PUT command. In the case of updating an experiment, the `name` and `list of trace UUIDs` have to be present, even if some parts don't change. The PUT command replaces the experiment resource on the server with a new one.

PATCH commands don't have that requirement of having to be idempotent. They can be idempotent, but don't have to. PATCH can be used to update parts of the experiment resource. For example, when updating the name of an experiment only the `name` has to be passed in the PATCH request, and not the `list of trace UUIDs`.

For both PUT and PATCH, the experiment UUID must not change. The Trace Server implementation needs to be able to provide that.

For updating of an experiment PATCH would be more suitable because only the name to be modified needs to be provided.

`Notes`:

- The current Trace Compass server implementation creates the UUID based on the experiment name and persists the experiment as folder resource in the server workspace. Renaming an experiment and renaming the corresponding workspace resource would lead to a change of the UUID as well. Hence, the server implementation needs to be changed to return the same UUID.
- Renaming the workspace resource, all relevant experiment, trace and data provider resources will need to be disposed before the rename action. Because of the disposal of the data providers, the front-end will need to be fully refreshed to update stale cached information.
- Adding and removing of traces in an experiment will affect the start/end time, available views and other capabilities. The front-end will need to be fully refreshed and any invalid views need to be removed. This can be achieved by closing the experiment front-end.

## Decision

Implement PATCH endpoint for updating of an experiment. PATCH is easier to implement because only the to-be-updated parameters need to be passed in the command. If needed, added traces will have to be uploaded first, while removed traces need to be removed automatically by the server (if not in use otherwise). The UUID will be unchanged.

The server will be updated to support the new use cases. Clients will see the updated experiment on a refresh.

## Consequences

### Easier to do

Introducing a dedicated command to update will simplify the client implementation. It's mainly a server-side implementation, and hence, all clients will benefit from the server implementation.

### More difficult

The server implementation will be more complicated and will require a thread-safe implementation, so that other commands to the experiment endpoints using the same UUID succeed or are handled gracefully.

### Risks introduced

Because of changing the experiment parameters, the client performing the update will have to refresh cached information to avoid client-side errors.

Other clients won't be aware of any updated experiments, and hence errors can happen during query operations, if cached information is used. Introducing some notification channel, like server-side events, in the future can mitigate the risk.

[tsp]: https://github.com/theia-ide/trace-server-protocol/blob/10cc9ba5419656315333cdac4fb8e392b1c752e7/API-proposed.yaml#L902
