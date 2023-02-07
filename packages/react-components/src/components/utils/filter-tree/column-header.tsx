import { DataType } from 'tsp-typescript-client/lib/models/data-type';

export default interface ColumnHeader {
    title: string,
    tooltip?: string,
    sortable?: boolean,
    resizable?: boolean,
    dataType?: DataType
}
