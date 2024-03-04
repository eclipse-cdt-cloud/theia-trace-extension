import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PortPreferenceProxy, TRACE_VIEWER_DEFAULT_PORT } from '../common/trace-server-url-provider';
import { TracePreferences, TRACE_PORT } from './trace-server-preference';

@injectable()
export class PreferencesFrontendContribution implements FrontendApplicationContribution {
    constructor(
        @inject(TracePreferences) protected tracePreferences: TracePreferences,
        @inject(PortPreferenceProxy) protected portPreferenceProxy: PortPreferenceProxy
    ) {}

    async initialize(): Promise<void> {
        this.tracePreferences.ready.then(() => {
            // assume the backend starts with the default server port - if the user configured
            // a different port in the preferences, tell backend to change it
            const tracePortPref = this.tracePreferences[TRACE_PORT];
            if (tracePortPref === TRACE_VIEWER_DEFAULT_PORT) {
                this.portPreferenceProxy.onPortPreferenceChanged(tracePortPref);
            } else {
                this.portPreferenceProxy.onPortPreferenceChanged(tracePortPref, TRACE_VIEWER_DEFAULT_PORT, true);
            }

            this.tracePreferences.onPreferenceChanged(async event => {
                if (event.preferenceName === TRACE_PORT) {
                    const newValue = typeof event.newValue === 'string' ? parseInt(event.newValue) : event.newValue;
                    const oldValue = typeof event.oldValue === 'string' ? parseInt(event.oldValue) : event.oldValue;
                    this.portPreferenceProxy.onPortPreferenceChanged(newValue, oldValue, true);
                }
            });
        });
    }
}
