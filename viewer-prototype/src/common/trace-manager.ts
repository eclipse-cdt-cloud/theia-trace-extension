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
import { Path } from '@theia/core';
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { Query } from 'tsp-typescript-client/lib/models/query/query';

export class TraceManager {
    private static instance: TraceManager;
    private tspClient: TspClient;

    private fOpenTraces: Map<string, Trace>;

    private constructor() {
        this.fOpenTraces = new Map();
        this.tspClient = new TspClient('http://localhost:8080/tsp/api');
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new TraceManager();
        }
        return this.instance;
    }

    getOpenTraces() {
        return this.fOpenTraces.values;
    }

    getTrace(traceName: string) {
        return this.fOpenTraces.get(traceName);
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
            this.removeTrace(traceToClose.name);

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

    private removeTrace(traceName: string) {
        this.fOpenTraces.delete(traceName);
    }
}
