import { action } from 'typesafe-actions';
import { ADD_TRACE, ADD_OUTPUT } from './action-types';
import { Trace } from 'tsp-typescript-client/lib/models/trace';
import { OutputDescriptor } from 'tsp-typescript-client/lib/models/output-descriptor';

export const addTrace = (trace: Trace) => action(ADD_TRACE, trace);
export const addOutput = (outputDescriptor: OutputDescriptor) => action(ADD_OUTPUT, outputDescriptor);