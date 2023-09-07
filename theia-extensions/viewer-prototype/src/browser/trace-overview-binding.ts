import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceService, createPreferenceProxy, PreferenceContribution } from '@theia/core/lib/browser';
import { OverviewPreferences, OverviewSchema } from './trace-overview-preference';

export function bindTraceOverviewPreferences(bind: interfaces.Bind): void {
    bind(OverviewPreferences)
        .toDynamicValue(ctx => {
            const preferences = ctx.container.get<PreferenceService>(PreferenceService);
            return createPreferenceProxy(preferences, OverviewSchema);
        })
        .inSingletonScope();
    bind(PreferenceContribution).toConstantValue({
        schema: OverviewSchema
    });
}
