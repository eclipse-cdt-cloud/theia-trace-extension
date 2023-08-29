import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { inject, injectable } from 'inversify';
import { PortPreferenceProxy } from '../common/trace-server-url-provider';
import { TracePreferences, TRACE_PORT } from './trace-server-preference';

@injectable()
export class PreferencesFrontendContribution implements FrontendApplicationContribution {
    constructor(
        @inject(TracePreferences) protected tracePreferences: TracePreferences,
        @inject(PortPreferenceProxy) protected portPreferenceProxy: PortPreferenceProxy
    ) {}

    async initialize(): Promise<void> {
        this.tracePreferences.ready.then(() => {
            this.portPreferenceProxy.onPortPreferenceChanged(this.tracePreferences[TRACE_PORT]);
            this.tracePreferences.onPreferenceChanged(async event => {
                const newValue = typeof event.newValue === 'string' ? parseInt(event.newValue) : event.newValue;
                const oldValue = typeof event.oldValue === 'string' ? parseInt(event.oldValue) : event.oldValue;
                this.portPreferenceProxy.onPortPreferenceChanged(newValue, oldValue, true);
            });
        });
    }
}
