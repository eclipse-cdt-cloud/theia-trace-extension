/*
 * SPDX-License-Identifier: MIT
 *
 * Copyright (C) 2020 École Polytechnique de Montréal
 */

import { inject, injectable, postConstruct } from 'inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { DefaultFrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
import { Disposable, DisposableCollection } from '@theia/core/lib//common';
import { ConnectionStatusService, ConnectionStatus, AbstractConnectionStatusService } from '@theia/core/lib/browser/connection-status-service';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';

@injectable()
export class TraceServerConnectionStatusService extends AbstractConnectionStatusService {

    private scheduledPing: number | undefined;

    private constructor(
        @inject(TspClient) private tspClient: TspClient
    ) {
        super();
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
                await this.tspClient.fetchExperiments();
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

    protected readonly toDisposeOnOnline = new DisposableCollection();

    constructor(
        @inject(TraceServerConnectionStatusService) protected readonly connectionStatusService: ConnectionStatusService,
        @inject(StatusBar) protected readonly statusBar: StatusBar,
        @inject(ILogger) protected readonly logger: ILogger
    ) {
        super();
        this.connectionStatusService.onStatusChange(state => this.onStateChange(state));
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

    private statusbarId = 'trace-connection-status';

    protected handleOnline(): void {
        this.toDisposeOnOnline.dispose();
    }

    protected handleOffline(): void {
        this.statusBar.setElement(this.statusbarId, {
            alignment: StatusBarAlignment.LEFT,
            text: 'Trace Server Offline',
            tooltip: 'Cannot connect to trace server.',
            priority: 5000
        });
        this.toDisposeOnOnline.push(Disposable.create(() => this.statusBar.removeElement(this.statusbarId)));
        document.body.classList.add('traceserver-mod-offline');
        this.toDisposeOnOnline.push(Disposable.create(() => document.body.classList.remove('traceserver-mod-offline')));
    }
}
