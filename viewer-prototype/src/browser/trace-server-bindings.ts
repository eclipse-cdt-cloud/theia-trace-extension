import { interfaces } from 'inversify';
import { PreferenceService, createPreferenceProxy, PreferenceContribution } from '@theia/core/lib/browser';
import { TracePreferences, ServerSchema } from './trace-server-preference';

export function bindTraceServerPreferences(bind: interfaces.Bind): void {
    bind(TracePreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        return createPreferenceProxy(preferences, ServerSchema);
    }).inSingletonScope();

    bind(PreferenceContribution).toConstantValue({
        schema: ServerSchema,
    });

}
