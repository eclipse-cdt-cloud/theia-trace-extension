/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { Path, Emitter } from '@theia/core';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Query } from 'tsp-typescript-client/lib/models/query/query';
import { injectable, inject } from 'inversify';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';

@injectable()
export class TraceManager {
    // Open signal
    private traceOpenedEmitter = new Emitter<Trace>();
    public traceOpenedSignal = this.traceOpenedEmitter.event;

    // Close signal
    private traceClosedEmitter = new Emitter<Trace>();
    public traceClosedSignal = this.traceClosedEmitter.event;

    private fOpenTraces: Map<string, Trace>;

    private constructor(
        @inject(TspClient) private tspClient: TspClient
    ) {
        this.fOpenTraces = new Map();
    }

    getOpenTraces() {
        const openedTraces: Array<Trace> = new Array();
        for(let entry of this.fOpenTraces) {
            openedTraces.push(entry[1]);
        }
        return openedTraces;
    }

    getTrace(traceName: string) {
        return this.fOpenTraces.get(traceName);
    }

    async getAvailableOutputs(traceName: string): Promise<OutputDescriptor[] | undefined> {
        const trace = this.fOpenTraces.get(traceName);
        if (trace) {
            try {
                return await this.tspClient.experimentOutputs(trace.UUID);
            } catch (e) {
                return undefined;
            }
        }
        return undefined;
    }

    async openTrace(traceURI: Path, traceName?: string): Promise<Trace | undefined> {
        let name = traceURI.name;
        if (traceName) {
            name = traceName;
        }
        const tracePath = traceURI.toString();
        const params: URLSearchParams = new URLSearchParams();
        params.set('name', name);
        params.set('path', tracePath);
        // const requestBody = 'path=' + tracePath + '&' + 'name=' + name; // /home/esideli/git/tracecompass-test-traces/ctf/src/main/resources/kernel&name=kernel'

        try {
            const trace: Trace = await this.tspClient.openTrace(new Query({
                'name': name,
                'uri': tracePath
            }, []));
            // const trace: Trace = await RestRequest.post('http://localhost:8080/tsp/api/traces', params);
            this.addTrace(trace);
            this.traceOpenedEmitter.fire(trace);
            return trace;
        } catch (e) {
            return undefined;
        }
        // const res = await fetch('http://localhost:8080/tsp/api/traces', {
        //     method: 'post',
        //     headers: {
        //         "Content-type": "application/x-www-form-urlencoded"
        //     },
        //     body: requestBody
        // });

        // if (res.ok) {
        //     const traceJson = await res.json();
        //     const trace = <Trace>traceJson;
        //     this.addTrace(trace);
        //     return trace;
        // } else {
        //     return undefined;
        // }
    }

    /**
     * Update the trace with the latest info from the server.
     * @param traceName Trace name to update
     * @returns The updated trace or undefined if the trace was not open previously
     */
    async updateTrace(traceName: string): Promise<Trace | undefined> {
        const currentTrace = this.fOpenTraces.get(traceName);
        if (currentTrace) {
            const trace = await this.tspClient.fetchTrace(currentTrace.UUID);
            this.fOpenTraces.set(traceName, trace);
            return trace;
        }

        return undefined;
    }

    async closeTrace(trace: Trace, traceURI: Path) {
        let traceToClose: Trace | undefined = trace;
        if (!traceToClose) {
            traceToClose = this.fOpenTraces.get(traceURI.name);
        }

        if (traceToClose) {
            const traceUUID = traceToClose.UUID;
            // const requestURL = 'http://localhost:8080/tsp/api/traces' + '/' + traceUUID;
            await this.tspClient.deleteTrace(traceUUID);
            // await RestRequest.delete(requestURL);
            const deletedTrace = this.removeTrace(traceToClose.name);
            if (deletedTrace) {
                this.traceClosedEmitter.fire(deletedTrace);
            }

            // const res = await fetch(requestURL, {
            //     method: 'delete'
            // });

            // if (res.ok) {
            //     this.removeTrace(traceToClose.name);
            // }
        }

    }

    private addTrace(trace: Trace) {
        this.fOpenTraces.set(trace.name, trace);
    }

    private removeTrace(traceName: string): Trace | undefined {
        const deletedTrace = this.fOpenTraces.get(traceName);
        this.fOpenTraces.delete(traceName);
        return deletedTrace;
    }
}
