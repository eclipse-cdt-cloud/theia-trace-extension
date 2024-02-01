import { ITspClient } from 'tsp-typescript-client';
import { Configuration } from 'tsp-typescript-client/lib/models/configuration';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';
import { Query } from 'tsp-typescript-client/lib/models/query/query';

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

    async fetchConfigurations(typeId: string): Promise<Configuration[] | undefined> {
        const outputsResponse = await this.tspClient.fetchConfigurations(typeId);
        if (outputsResponse && outputsResponse.isOk()) {
            return outputsResponse.getModel();
        }
        return undefined;
    }

    async createConfiguration(sourceTypeId: string, query: Query): Promise<Configuration | undefined> {
        const outputsResponse = await this.tspClient.createConfiguration(sourceTypeId, query);
        if (outputsResponse && outputsResponse.isOk()) {
            return outputsResponse.getModel();
        }

        return undefined;
    }

    async deleteConfiguration(sourceTypeId: string, configId: string): Promise<Configuration | undefined> {
        const outputsResponse = await this.tspClient.deleteConfiguration(sourceTypeId, configId);
        if (outputsResponse && outputsResponse.isOk()) {
            return outputsResponse.getModel();
        }

        return undefined;
    }
}
