import { injectable } from 'inversify';
import fs = require('fs');
import { Dirent } from 'fs';
import { Path } from '@theia/core/lib/common/path';
import { CancellationToken } from '@theia/core';
import { BackendFileService } from '../common/backend-file-service';
import { FileUri } from '@theia/core/lib/node';

@injectable()
export class BackendFileServiceImpl implements BackendFileService {

    async findTraces(path: string, cancellationToken: CancellationToken): Promise<string[]> {
        /*
        * On Windows, Theia returns a path that starts with "/" (e.g "/c:/"), causing fsPromise.stat
        * to fail. FileUri.fsPath returns the platform specific path of the orginal Theia path
        * that fixes this issue.
        */
        const cleanedPath = FileUri.fsPath(path);

        const traces: string[] = [];
        const stats = await fs.promises.stat(cleanedPath);
        if (stats.isDirectory()) {
            await this.deepFindTraces(cleanedPath, traces, cancellationToken);
        } else if (stats.isFile()) {
            traces.push(cleanedPath);
        }
        if (cancellationToken.isCancellationRequested) {
            return [];
        }
        return traces;
    }

    /**
     * Find traces recursively in the specified folder path, adding the path of
     * found traces to the specified traces array.
     *
     * This implementation only finds CTF traces.
     *
     * @param path current folder path
     * @param traces array of found traces paths
     * @param cancellationToken cancellation token
     * @returns an empty promise
     */
    private async deepFindTraces(path: string, traces: string[], cancellationToken: CancellationToken): Promise<void> {
        const childDirs: Dirent[] = [];
        for await (const dirent of await fs.promises.opendir(path)) {
            if (cancellationToken.isCancellationRequested) {
                return;
            }
            if (dirent.isDirectory()) {
                childDirs.push(dirent);
            } else if (dirent.name === 'metadata') {
                /* This dir is a CTF trace, ignore all child dirs */
                traces.push(path);
                return;
            }
        }
        /* This dir was not a trace, recurse through its child dirs */
        const parent = new Path(path);
        for (const dirent of childDirs) {
            if (cancellationToken.isCancellationRequested) {
                return;
            }
            const childPath = parent.join(dirent.name);
            await this.deepFindTraces(childPath.toString(), traces, cancellationToken);
        }
    }
}
