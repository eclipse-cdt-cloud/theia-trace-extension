import { PreferenceSchema, PreferenceProxy, PreferenceScope } from '@theia/core/lib/browser';
import { TRACE_VIEWER_DEFAULT_PORT } from '../common/trace-server-url-provider';

export const TRACE_PATH = 'trace Viewer.trace Server.path';
export const TRACE_PORT = 'trace Viewer.trace Viewer.port';
export const TRACE_ARGS = 'trace Viewer.trace Server.arguments';

export const ServerSchema: PreferenceSchema = {
    scope: PreferenceScope.Folder,
    type: 'object',
    properties: {
        [TRACE_PATH]: {
            type: 'string',
            description: 'The path to trace-server executable, e.g.: /usr/bin/tracecompass-server'
        },
        [TRACE_PORT]: {
            type: 'integer',
            default: TRACE_VIEWER_DEFAULT_PORT,
            description: 'Specify the port the Trace Viewer would use to connect to the trace server'
        },
        [TRACE_ARGS]: {
            type: 'string',
            default: '',
            description:
                'Specify trace-server command line arguments. This change will take effect the next time the trace server starts.' +
                '\n' +
                'E.g. for Trace Compass server: -data /home/user/server-workspace -vmargs -Dtraceserver.port=8080'
        }
    }
};

interface TracePreferenceContribution {
    [TRACE_PATH]?: string;
    [TRACE_PORT]: number;
    [TRACE_ARGS]: string;
}

export const TracePreferences = Symbol('TracePreferences');
export type TracePreferences = PreferenceProxy<TracePreferenceContribution>;
