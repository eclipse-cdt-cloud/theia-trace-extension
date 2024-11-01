import { inject, injectable, interfaces } from '@theia/core/shared/inversify';
import { AnnotationCategoriesModel, AnnotationModel } from 'tsp-typescript-client/lib/models/annotation';
import { Configuration } from 'tsp-typescript-client/lib/models/configuration';
import { ConfigurationSourceType } from 'tsp-typescript-client/lib/models/configuration-source';
import { DataTreeEntry } from 'tsp-typescript-client/lib/models/data-tree';
import { EntryModel } from 'tsp-typescript-client/lib/models/entry';
import { Experiment } from 'tsp-typescript-client/lib/models/experiment';
import { HealthStatus } from 'tsp-typescript-client/lib/models/health';
import { Identifier } from 'tsp-typescript-client/lib/models/identifier';
import { MarkerSet } from 'tsp-typescript-client/lib/models/markerset';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';
import { ConfigurationQuery, OutputConfigurationQuery, Query } from 'tsp-typescript-client/lib/models/query/query';
import { GenericResponse } from 'tsp-typescript-client/lib/models/response/responses';
import { OutputStyleModel } from 'tsp-typescript-client/lib/models/styles';
import { ColumnHeaderEntry, TableModel } from 'tsp-typescript-client/lib/models/table';
import { TimeGraphArrow, TimeGraphEntry, TimeGraphModel } from 'tsp-typescript-client/lib/models/timegraph';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { XyEntry, XYModel } from 'tsp-typescript-client/lib/models/xy';
import { ITspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { TspClientResponse } from 'tsp-typescript-client/lib/protocol/tsp-client-response';

export const TspClientProxy = Symbol('TspClientProxy') as symbol & interfaces.Abstract<TspClientProxy>;
export type TspClientProxy = ITspClient;

@injectable()
export class TheiaRpcTspProxy implements ITspClient {
    public constructor(@inject(TspClientProxy) protected tspClient: ITspClient) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    protected toTspClientResponse<T>(result: any): TspClientResponse<T> {
        const tspClientResponse: TspClientResponse<T> = new TspClientResponse(
            result.text,
            result.statusCode,
            result.statusMessage,
            result.responseModel
        );
        return tspClientResponse;
    }

    /**
     * Fetch all available traces on the server
     * @returns List of Trace
     */
    public async fetchTraces(): Promise<TspClientResponse<Trace[]>> {
        return this.toTspClientResponse<Trace[]>(await this.tspClient.fetchTraces());
    }

    /**
     * Fetch a specific trace information
     * @param traceUUID Trace UUID to fetch
     */
    public async fetchTrace(traceUUID: string): Promise<TspClientResponse<Trace>> {
        return this.toTspClientResponse<Trace>(await this.tspClient.fetchTrace(traceUUID));
    }

    /**
     * Open a trace on the server
     * @param parameters Query object
     * @returns The opened trace
     */
    public async openTrace(parameters: Query): Promise<TspClientResponse<Trace>> {
        return this.toTspClientResponse<Trace>(await this.tspClient.openTrace(parameters));
    }

    /**
     * Delete a trace on the server
     * @param traceUUID Trace UUID to delete
     * @param deleteTrace Also delete the trace from disk
     * @param removeCache Remove all cache for this trace
     * @returns The deleted trace
     */
    public async deleteTrace(
        traceUUID: string,
        deleteTrace?: boolean,
        removeCache?: boolean
    ): Promise<TspClientResponse<Trace>> {
        return this.toTspClientResponse<Trace>(await this.tspClient.deleteTrace(traceUUID, deleteTrace, removeCache));
    }

    /**
     * Fetch all available experiments on the server
     * @returns List of Experiment
     */
    public async fetchExperiments(): Promise<TspClientResponse<Experiment[]>> {
        return this.toTspClientResponse<Experiment[]>(await this.tspClient.fetchExperiments());
    }

    /**
     * Fetch a specific experiment information
     * @param expUUID Experiment UUID to fetch
     * @returns The experiment
     */
    public async fetchExperiment(expUUID: string): Promise<TspClientResponse<Experiment>> {
        return this.toTspClientResponse<Experiment>(await this.tspClient.fetchExperiment(expUUID));
    }

    /**
     * Create an experiment on the server
     * @param parameters Query object
     * @returns The created experiment
     */
    public async createExperiment(parameters: Query): Promise<TspClientResponse<Experiment>> {
        return this.toTspClientResponse<Experiment>(await this.tspClient.createExperiment(parameters));
    }

    /**
     * Update an experiment
     * @param expUUID Experiment UUID to update
     * @param parameters Query object
     * @returns The updated experiment
     */
    public async updateExperiment(expUUID: string, parameters: Query): Promise<TspClientResponse<Experiment>> {
        return this.toTspClientResponse<Experiment>(await this.tspClient.updateExperiment(expUUID, parameters));
    }

    /**
     * Delete an experiment on the server
     * @param expUUID Experiment UUID to delete
     * @returns The deleted experiment
     */
    public async deleteExperiment(expUUID: string): Promise<TspClientResponse<Experiment>> {
        return this.toTspClientResponse<Experiment>(await this.tspClient.deleteExperiment(expUUID));
    }

    /**
     * List all the outputs associated to this experiment
     * @param expUUID Experiment UUID
     * @returns List of OutputDescriptor
     */
    public async experimentOutputs(expUUID: string): Promise<TspClientResponse<OutputDescriptor[]>> {
        return this.toTspClientResponse<OutputDescriptor[]>(await this.tspClient.experimentOutputs(expUUID));
    }

    /**
     * Fetch Data tree
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Generic entry response with entries
     */
    public async fetchDataTree(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<EntryModel<DataTreeEntry>>>> {
        return this.toTspClientResponse<GenericResponse<EntryModel<DataTreeEntry>>>(
            await this.tspClient.fetchDataTree(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch XY tree
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Generic entry response with entries
     */
    public async fetchXYTree(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<EntryModel<XyEntry>>>> {
        return this.toTspClientResponse<GenericResponse<EntryModel<XyEntry>>>(
            await this.tspClient.fetchXYTree(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch XY. model extends XYModel
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns XY model response with the model
     */
    public async fetchXY(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<XYModel>>> {
        return this.toTspClientResponse<GenericResponse<XYModel>>(
            await this.tspClient.fetchXY(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch XY tooltip
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param xValue X value
     * @param yValue Optional Y value
     * @param seriesID Optional series ID
     * @returns Map of key=name of the property and value=string value associated
     */
    public async fetchXYToolTip(
        expUUID: string,
        outputID: string,
        xValue: number,
        yValue?: number,
        seriesID?: string
    ): Promise<TspClientResponse<GenericResponse<{ [key: string]: string }>>> {
        return this.toTspClientResponse<GenericResponse<{ [key: string]: string }>>(
            await this.tspClient.fetchXYToolTip(expUUID, outputID, xValue, yValue, seriesID)
        );
    }

    /**
     * Fetch Time Graph tree, Model extends TimeGraphEntry
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Time graph entry response with entries of type TimeGraphEntry
     */
    public async fetchTimeGraphTree(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<EntryModel<TimeGraphEntry>>>> {
        return this.toTspClientResponse<GenericResponse<EntryModel<TimeGraphEntry>>>(
            await this.tspClient.fetchTimeGraphTree(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch Time Graph states. Model extends TimeGraphModel
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Generic response with the model
     */
    public async fetchTimeGraphStates(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<TimeGraphModel>>> {
        return this.toTspClientResponse<GenericResponse<TimeGraphModel>>(
            await this.tspClient.fetchTimeGraphStates(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch Time Graph arrows. Model extends TimeGraphArrow
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Generic response with the model
     */
    public async fetchTimeGraphArrows(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<TimeGraphArrow[]>>> {
        return this.toTspClientResponse<GenericResponse<TimeGraphArrow[]>>(
            await this.tspClient.fetchTimeGraphArrows(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch marker sets.
     * @returns Generic response with the model
     */
    public async fetchMarkerSets(expUUID: string): Promise<TspClientResponse<GenericResponse<MarkerSet[]>>> {
        return this.toTspClientResponse<GenericResponse<MarkerSet[]>>(await this.tspClient.fetchMarkerSets(expUUID));
    }

    /**
     * Fetch annotations categories.
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param markerSetId Marker Set ID
     * @returns Generic response with the model
     */
    public async fetchAnnotationsCategories(
        expUUID: string,
        outputID: string,
        markerSetId?: string
    ): Promise<TspClientResponse<GenericResponse<AnnotationCategoriesModel>>> {
        return this.toTspClientResponse<GenericResponse<AnnotationCategoriesModel>>(
            await this.tspClient.fetchAnnotationsCategories(expUUID, outputID, markerSetId)
        );
    }

    /**
     * Fetch annotations.
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Generic response with the model
     */
    public async fetchAnnotations(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<AnnotationModel>>> {
        return this.toTspClientResponse<GenericResponse<AnnotationModel>>(
            await this.tspClient.fetchAnnotations(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch tooltip for a Time Graph element.
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Map of key=name of the property and value=string value associated
     */
    public async fetchTimeGraphTooltip(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<{ [key: string]: string }>>> {
        return this.toTspClientResponse<GenericResponse<{ [key: string]: string }>>(
            await this.tspClient.fetchTimeGraphTooltip(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch Table columns
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Generic entry response with columns headers as model
     */
    public async fetchTableColumns(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<ColumnHeaderEntry[]>>> {
        return this.toTspClientResponse<GenericResponse<ColumnHeaderEntry[]>>(
            await this.tspClient.fetchTableColumns(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch Table lines
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Generic response with the model
     */
    public async fetchTableLines(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<TableModel>>> {
        return this.toTspClientResponse<GenericResponse<TableModel>>(
            await this.tspClient.fetchTableLines(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch output styles
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters Query object
     * @returns Generic response with the model
     */
    public async fetchStyles(
        expUUID: string,
        outputID: string,
        parameters: Query
    ): Promise<TspClientResponse<GenericResponse<OutputStyleModel>>> {
        return this.toTspClientResponse<GenericResponse<OutputStyleModel>>(
            await this.tspClient.fetchStyles(expUUID, outputID, parameters)
        );
    }

    /**
     * Fetch all configuration source types for a given experiment and output
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @returns Generic response with the model
     */
    public async fetchOutputConfigurationTypes(
        expUUID: string,
        outputID: string
    ): Promise<TspClientResponse<ConfigurationSourceType[]>> {
        return this.toTspClientResponse<ConfigurationSourceType[]>(
            await this.tspClient.fetchOutputConfigurationTypes(expUUID, outputID)
        );
    }

    /**
     * Fetch configuration source type for a given type ID, experiment and output
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param typeID the ID of the configuration source type
     * @returns Generic response with the model
     */
    public async fetchOutputConfigurationType(
        expUUID: string,
        outputID: string,
        typeID: string
    ): Promise<TspClientResponse<ConfigurationSourceType>> {
        return this.toTspClientResponse<ConfigurationSourceType>(
            await this.tspClient.fetchOutputConfigurationType(expUUID, outputID, typeID)
        );
    }

    /**
     * Create a derived output for a given experiment, output and parameters
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param parameters OutputConfigurationQuery object
     * @returns the output descriptor of the derived output
     */
    public async createDerivedOutput(
        expUUID: string,
        outputID: string,
        parameters: OutputConfigurationQuery
    ): Promise<TspClientResponse<OutputDescriptor>> {
        return this.toTspClientResponse<OutputDescriptor>(
            await this.tspClient.createDerivedOutput(expUUID, outputID, parameters)
        );
    }

    /**
     * Delete a derived output (and it's configuration) for a given experiment,
     * output and derived output
     * @param expUUID Experiment UUID
     * @param outputID Output ID
     * @param derivedOutputID the ID of the derived output
     * @returns the output descriptor of the deleted derived output
     */
    public async deleteDerivedOutput(
        expUUID: string,
        outputID: string,
        derivedOutputID: string
    ): Promise<TspClientResponse<OutputDescriptor>> {
        return this.toTspClientResponse<OutputDescriptor>(
            await this.tspClient.deleteDerivedOutput(expUUID, outputID, derivedOutputID)
        );
    }

    /**
     * Check the health status of the server
     * @returns The Health Status
     */
    public async checkHealth(): Promise<TspClientResponse<HealthStatus>> {
        return this.toTspClientResponse<HealthStatus>(await this.tspClient.checkHealth());
    }

    /**
     * Fetch the identifier service
     * @returns Important information regarding the trace server and the system it is running on
     */
    public async fetchIdentifier(): Promise<TspClientResponse<Identifier>> {
        return this.toTspClientResponse<Identifier>(await this.tspClient.fetchIdentifier());
    }

    /**
     * Fetch all configuration source types
     * @returns Generic response with the model
     */
    public async fetchConfigurationSourceTypes(): Promise<TspClientResponse<ConfigurationSourceType[]>> {
        return this.toTspClientResponse<ConfigurationSourceType[]>(
            await this.tspClient.fetchConfigurationSourceTypes()
        );
    }

    /**
     * Fetch configuration source type for a given type ID
     * @param typeId the ID of the configuration source type
     * @returns Generic response with the model
     */
    public async fetchConfigurationSourceType(typeId: string): Promise<TspClientResponse<ConfigurationSourceType>> {
        return this.toTspClientResponse<ConfigurationSourceType>(
            await this.tspClient.fetchConfigurationSourceType(typeId)
        );
    }

    /**
     * Fetch all configurations for a given type ID
     * @param typeId the ID of the configuration source type
     * @returns Generic response with the model
     */
    public async fetchConfigurations(typeId: string): Promise<TspClientResponse<Configuration[]>> {
        return this.toTspClientResponse<Configuration[]>(await this.tspClient.fetchConfigurations(typeId));
    }

    /**
     * Fetch a configuration by ID for a given type ID
     * @param typeId the ID of the configuration source type
     * @param configId the ID of the configuration
     * @returns Generic response with the model
     */
    public async fetchConfiguration(typeId: string, configId: string): Promise<TspClientResponse<Configuration>> {
        return this.toTspClientResponse<Configuration>(await this.tspClient.fetchConfiguration(typeId, configId));
    }

    /**
     * Create a configuration for a given type ID and parameters
     * @param typeId the ID of the configuration source type
     * @param parameters ConfigurationQuery object
     * @returns Generic response with the model
     */
    public async createConfiguration(
        typeId: string,
        parameters: ConfigurationQuery
    ): Promise<TspClientResponse<Configuration>> {
        return this.toTspClientResponse<Configuration>(await this.tspClient.createConfiguration(typeId, parameters));
    }

    /**
     * Update a configuration for a given type ID, config ID and parameters
     * @param typeId the ID of the configuration source type
     * @param configId the ID of the configuration
     * @param parameters ConfigurationQuery object
     * @returns Generic response with the model
     */
    public async updateConfiguration(
        typeId: string,
        configId: string,
        parameters: ConfigurationQuery
    ): Promise<TspClientResponse<Configuration>> {
        return this.toTspClientResponse<Configuration>(
            await this.tspClient.updateConfiguration(typeId, configId, parameters)
        );
    }

    /**
     * Delete a configuration for a given type ID and config ID
     * @param typeId the ID of the configuration source type
     * @param configId the ID of the configuration
     * @returns Generic response with the model
     */
    public async deleteConfiguration(typeId: string, configId: string): Promise<TspClientResponse<Configuration>> {
        return this.toTspClientResponse<Configuration>(await this.tspClient.deleteConfiguration(typeId, configId));
    }
}
