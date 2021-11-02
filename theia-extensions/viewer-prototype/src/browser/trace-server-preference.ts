import { PreferenceSchema, PreferenceProxy, PreferenceScope } from '@theia/core/lib/browser';
import { TRACE_SERVER_DEFAULT_PORT } from '../common/trace-server-url-provider';

export const TRACE_PATH = 'trace-viewer.path';
export const TRACE_PORT = 'trace-viewer.port';
export const TRACE_HELP_INTRO = 'https://github.com/dorsal-lab/Tracevizlab/tree/master/labs/001-what-is-tracing';
export const TRACE_HELP_EXAMPLE = 'https://github.com/dorsal-lab/Tracevizlab/tree/master/labs/004-record-kernel-trace-ftrace';

export const ServerSchema: PreferenceSchema = {
    scope: PreferenceScope.Folder,
    type: 'object',
    properties: {
        [TRACE_PATH]: {
            type: 'string',
            default: '',
            description: 'The path to trace-server executable, e.g.: /usr/bin/tracecompass-server',
        },
        [TRACE_PORT]: {
            type: 'number',
            default: TRACE_SERVER_DEFAULT_PORT,
            description: 'Specify the port on which you want to execute the server. This change will take effect the next time you open a trace',
        }
    },
};

interface TracePreferenceContribution {
    [TRACE_PATH]: string;
    [TRACE_PORT]: number;
}

export const TracePreferences = Symbol('TracePreferences');
export type TracePreferences = PreferenceProxy<TracePreferenceContribution>;
