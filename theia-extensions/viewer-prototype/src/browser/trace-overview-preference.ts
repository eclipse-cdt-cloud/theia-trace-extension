import { PreferenceProxy, PreferenceSchema, PreferenceScope } from '@theia/core/lib/browser';

export const TRACE_OVERVIEW_DEFAULT_VIEW_KEY = 'trace Viewer.trace Overview.defaultView';
export const DEFAULT_OVERVIEW_OUTPUT_NAME = 'Histogram';

export function getSwitchToDefaultViewErrorMessage(preferredName: string, defaultName: string): string {
    return (
        `The ${preferredName} view cannot be opened as the trace overview. ` +
        `Opening ${defaultName} instead. ` +
        'Please set the Default View preference (Ctrl + ,) of the Trace Overview to an XY view, ' +
        'or make sure the name is spelled correctly.'
    );
}

export function getOpenTraceOverviewFailErrorMessage(): string {
    return 'An error has occurred while opening the trace overview.';
}

export const OverviewSchema: PreferenceSchema = {
    scope: PreferenceScope.Folder,
    type: 'object',
    properties: {
        [TRACE_OVERVIEW_DEFAULT_VIEW_KEY]: {
            type: 'string',
            default: DEFAULT_OVERVIEW_OUTPUT_NAME,
            description:
                'Specify the name of the view that will be used as the default view for the Trace Overview. ' +
                'Use the same name displayed in the Available Views list. E.g: For the Histogram view, enter Histogram.'
        }
    }
};

interface OverviewContribution {
    [TRACE_OVERVIEW_DEFAULT_VIEW_KEY]: string;
}

export const OverviewPreferences = Symbol('OverviewPreferences');
export type OverviewPreferences = PreferenceProxy<OverviewContribution>;
