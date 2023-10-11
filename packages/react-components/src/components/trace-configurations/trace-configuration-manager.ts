import { ITspClient } from 'tsp-typescript-client';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';

export class TraceConfigurationManager {
    private tspClient: ITspClient;

    constructor(tspClient: ITspClient) {
        this.tspClient = tspClient;
    }

    /**
     * Get an array of OutputDescriptor for a given experiment
     * @param experimentUUID experiment UUID
     */
    async getConfigurationSourceTypes(): Promise<ConfigurationSourceType[] | undefined> {
        const outputsResponse = await this.tspClient.fetchConfigurationSourceTypes();
        if (outputsResponse && outputsResponse.isOk()) {
            return outputsResponse.getModel();
        }
        return undefined;
    }
}
