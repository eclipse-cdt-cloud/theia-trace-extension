import { CancellationToken } from '@theia/core';

export const backendFileServicePath = '/services/theia-trace-extension/backend-service';
export const BackendFileService = Symbol('BackendFileService');

export interface BackendFileService {
    findTraces(uri: string, cancellationToken: CancellationToken): Promise<string[]>;
    createFile(fileName: string): void;
    writeToFile(data: string): void;
}
