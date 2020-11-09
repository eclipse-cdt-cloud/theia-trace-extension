/* eslint-disable @typescript-eslint/no-explicit-any */
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { OutputElementStyle } from 'tsp-typescript-client/lib/models/styles';

export class StyleProvider {
    private tspClient: TspClient;
    private traceId: string;
    private outputId: string;

    private tmpStyleObject: { [key: string]: { [key: string]: { [key: string]: any } } };

    private styles: { [key: string]: OutputElementStyle } | undefined;

    constructor(outputId: string, traceId: string, tspClient: TspClient) {
        this.outputId = outputId;
        this.tspClient = tspClient;
        this.traceId = traceId;
        const threadStyleObject = {
            '0': {
                color: '646464',
                height: 0.33
            },
            '2': {
                color: '00C800',
                height: 1
            },
            '3': {
                color: '0000C8',
                height: 1
            },
            '4': {
                color: 'C80064',
                height: 0.75
            },
            '1': {
                color: 'C8C800',
                height: 0.5
            },
            '5': {
                color: 'C86400',
                height: 0.5
            },
            '6': {
                color: 'C8C8C8',
                height: 0.5
            }
        };

        const resourceStyleObject = {
            '0': {
                color: 'C8C8C8',
                height: 0.66
            },
            '2': {
                color: '00C800',
                height: 1
            },
            '4': {
                color: '0000C8',
                height: 1
            },
            '16': {
                color: 'C80064',
                height: 0.75
            },
            '8': {
                color: 'C89664',
                height: 1
            },
            '1': {
                color: 'C8C800',
                height: 1
            }
        };
        this.tmpStyleObject = {
            'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ThreadStatusDataProvider': threadStyleObject,
            'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ResourcesStatusDataProvider': resourceStyleObject
        };
    }

    /**
     * Get the style for a specific output
     * @param forceUpdate Force the update of the current cached styles from the server
     */
    public async getStyles(forceUpdate?: boolean): Promise<{ [key: string]: OutputElementStyle }> {
        if (!this.styles || forceUpdate) {
            const styleResponse = await this.tspClient.fetchStyles(this.traceId, this.outputId, QueryHelper.query());
            const styleModel = styleResponse.getModel().model;
            const styles = styleModel.styles;
            this.styles = styles;
            return styles;
        }
        return this.styles;
    }

    public getStylesTmp(_forceUpdate?: boolean): { [key: string]: { [key: string]: any } } {
        const styles = this.tmpStyleObject[this.outputId];
        return styles ? styles : {};
    }
}
