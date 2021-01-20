/*
 * SPDX-License-Identifier: MIT
 *
 * Copyright (C) 2020 École Polytechnique de Montréal
 */

import { inject, injectable, postConstruct } from 'inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { DefaultFrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { StatusBar, StatusBarAlignment, StatusBarEntry } from '@theia/core/lib/browser/status-bar/status-bar';
import { ConnectionStatus, AbstractConnectionStatusService } from '@theia/core/lib/browser/connection-status-service';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientProvider } from './tsp-client-provider';
import { TraceServerConfigService } from '../common/trace-server-config';
import { PreferenceService } from '@theia/core/lib/browser';
import { TRACE_PATH, TRACE_PORT } from './trace-server-preference';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { MessageService } from '@theia/core';

@injectable()
export class TraceServerConnectionStatusService extends AbstractConnectionStatusService {

    private scheduledPing: number | undefined;
    private tspClient: TspClient;

    private constructor(
        @inject(TspClientProvider) private tspClientProvider: TspClientProvider
    ) {
        super();
        this.tspClient = this.tspClientProvider.getTspClient();
        this.tspClientProvider.addTspClientChangeListener(tspClient => this.tspClient = tspClient);
    }

    @postConstruct()
    protected init(): void {
        this.schedulePing();
    }

    protected schedulePing(): void {
        if (this.scheduledPing) {
            this.clearTimeout(this.scheduledPing);
        }
        this.scheduledPing = this.setTimeout(async () => {
            try {
                const pingTimeout = new Promise((_, reject) => { setTimeout(reject, this.options.offlineTimeout); });
                await Promise.race([this.tspClient.fetchExperiments(), pingTimeout]);
                this.updateStatus(true);
            } catch (e) {
                this.updateStatus(false);
                this.logger.trace(e);
            }
            this.schedulePing();
        }, this.options.offlineTimeout * 0.8);
    }
}

@injectable()
export class TraceServerConnectionStatusContribution extends DefaultFrontendApplicationContribution {

    static readonly STATUS_BAR_ID = 'trace-connection-status';
    static readonly SERVER_OFFLINE_CLASSNAME = 'traceserver-mod-offline';

    @inject(StatusBar) protected readonly statusBar: StatusBar;
    @inject(ILogger) protected readonly logger: ILogger;
    @inject(PreferenceService) protected readonly preferenceService: PreferenceService;
    @inject(TraceServerConfigService) protected readonly traceServerConfigService: TraceServerConfigService;
    @inject(TraceServerConnectionStatusService) protected readonly connectionStatusService: TraceServerConnectionStatusService;
    @inject(MessageService) protected readonly messageService: MessageService;

    protected path: string | undefined;
    protected port: number | undefined;

    protected serverPending = new Deferred<void>();

    @postConstruct()
    protected async init(): Promise<void> {
        this.connectionStatusService.onStatusChange(state => this.onStateChange(state));
        this.preferenceService.onPreferenceChanged(event => {
            if (event.preferenceName === TRACE_PORT) {
                this.port = event.newValue;
            }
            if (event.preferenceName === TRACE_PATH) {
                this.path = event.newValue;
            }
        });

        this.path = this.preferenceService.get(TRACE_PATH);
        this.port = this.preferenceService.get(TRACE_PORT);

        if (this.connectionStatusService.currentStatus === ConnectionStatus.ONLINE) {
            this.handleOnline();
        }
    }

    protected onStateChange(state: ConnectionStatus): void {
        switch (state) {
            case ConnectionStatus.OFFLINE: {
                this.handleOffline();
                break;
            }
            case ConnectionStatus.ONLINE: {
                this.handleOnline();
                break;
            }
        }
    }

    protected async startServer(): Promise<void> {
        this.updateStatusBar({ text: '$(sync~spin) Trace server starting' });

        try {
            await this.withTimeout(this.traceServerConfigService.startTraceServer(this.path, this.port));
        } catch {
            this.messageService.error('Failed to start trace server.');
            this.handleOffline();
        }
    }

    protected async stopServer(): Promise<void> {
        this.updateStatusBar({ text: '$(sync~spin) Trace server stopping' });

        try {
            await this.withTimeout(this.traceServerConfigService.stopTraceServer(this.port));
        } catch {
            this.messageService.error('Failed to terminate trace server.');
            this.handleOnline();
        }
    }

    protected handleOnline(): void {
        this.updateStatusBar({
            text: '$(fas fa-stop) Stop trace server',
            tooltip: 'Click here to stop the trace server',
            onclick: this.stopServer.bind(this),
        });

        this.serverPending.resolve();
    }

    protected handleOffline(): void {
        this.updateStatusBar({
            text: '$(fas fa-play) Start trace server',
            tooltip: 'Click here to start the trace server',
            onclick: this.startServer.bind(this),
        });

        this.serverPending.resolve();
    }

    // Must have text, other fields supplied
    protected updateStatusBar(options: Partial<StatusBarEntry> & { text: string }): void {
        this.statusBar.setElement(TraceServerConnectionStatusContribution.STATUS_BAR_ID, {
            alignment: StatusBarAlignment.LEFT,
            priority: 5001,
            ...options,
        });
    }

    protected withTimeout<T = void>(serverAction: Promise<T>): Promise<[T, void]> {
        this.serverPending = new Deferred();
        setTimeout(this.serverPending.reject, 10000);
        return Promise.all([serverAction, this.serverPending.promise]);
    }
}
