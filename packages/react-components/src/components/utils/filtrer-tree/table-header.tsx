import * as React from 'react';
import { SortConfig } from './sort';
import ColumnHeader from './column-header';

interface TableHeaderProps {
    columns: ColumnHeader[];
    sortableColumns: string[];
    sortConfig: SortConfig[];
    onSort: (sortColumn: string) => void;
}

export class TableHeader extends React.Component<TableHeaderProps> {
    private mouseDownX = 0;
    private originalWidth = 0;
    private resizedHeader: HTMLElement | undefined = undefined;
    private resizedIndex = 0;
    private gridTemplateColumns: string[];

    constructor(props: TableHeaderProps) {
        super(props);
        this.gridTemplateColumns = this.props.columns.map(() => 'max-content');
        this.gridTemplateColumns.push('minmax(0px, 1fr)');
    }

    handleSortChange = (sortColumn: string, ev: React.MouseEvent<HTMLTableCellElement, MouseEvent>): void => {
        const resizeHandle = ev.currentTarget.querySelector('.resize-handle');
        if (resizeHandle && ev.clientX >= resizeHandle.getBoundingClientRect().x) {
            /* Don't sort if click is over the resize handle */
            return;
        }
        this.props.onSort(sortColumn);
    };

    handleResizeDoubleClick = (ev: React.MouseEvent<HTMLSpanElement, MouseEvent>, index: number): void => {
        if (ev.currentTarget.parentElement?.parentElement) {
            const resizedHeader = ev.currentTarget.parentElement?.parentElement;
            const table = resizedHeader.parentElement?.parentElement?.parentElement;
            if (table) {
                this.gridTemplateColumns[index] = 'max-content';
                table.style.gridTemplateColumns = this.gridTemplateColumns.join(' ');
            }
        }
    };

    handleResizeMouseDown = (ev: React.MouseEvent<HTMLSpanElement, MouseEvent>, index: number): void => {
        if (ev.currentTarget.parentElement?.parentElement) {
            this.resizedHeader = ev.currentTarget.parentElement?.parentElement;
            this.resizedIndex = index;
            this.mouseDownX = ev.clientX;
            this.originalWidth = this.resizedHeader.clientWidth;
            window.addEventListener('mousemove', this.handleResizeMouseMove);
            window.addEventListener('mouseup', this.handleResizeMouseUp);
            ev.preventDefault();
        }
    };

    handleResizeMouseMove = (ev: MouseEvent): void => {
        if (this.resizedHeader) {
            const table = this.resizedHeader.parentElement?.parentElement?.parentElement;
            if (table) {
                const width = Math.max(18, this.originalWidth + ev.clientX - this.mouseDownX);
                this.gridTemplateColumns[this.resizedIndex] = width + 'px';
                table.style.gridTemplateColumns = this.gridTemplateColumns.join(' ');
            }
        }
    };

    handleResizeMouseUp = (): void => {
        window.removeEventListener('mousemove', this.handleResizeMouseMove);
        window.removeEventListener('mouseup', this.handleResizeMouseUp);
        this.resizedHeader = undefined;
        this.resizedIndex = 0;
        this.mouseDownX = 0;
        this.originalWidth = 0;
    };

    /* Capitalize first character and add non-breaking spaces to make room for icons in default width calcluation */
    toHeaderTitle = (name: string): string => (name.charAt(0).toUpperCase() + name.slice(1) + '\xa0\xa0\xa0\xa0\xa0');

    renderSortIcon = (column: string): React.ReactNode | undefined => {
        if (this.props.sortableColumns.includes(column)) {
            const state = this.props.sortConfig.find((config: SortConfig) => config.column === column);
            return state
                ? <span className='sort-icon'>{state.sortState}</span>
                : undefined;
        }
        return undefined;
    };

    renderResizeIcon = (index: number): React.ReactNode =>
        (this.props.columns[index].resizable)
            ? <span className='resize-handle' onMouseDown={ev => this.handleResizeMouseDown(ev, index)} onDoubleClick={ev => this.handleResizeDoubleClick(ev, index)}>|</span>
            : undefined;

    renderHeader = (): React.ReactNode => {
        const header = this.props.columns.map((column: ColumnHeader, index) =>
            <th key={'th-'+index} onClick={ev => this.handleSortChange(column.title, ev)}>
                <span>
                    {this.toHeaderTitle(column.title)}
                    {this.renderResizeIcon(index)}
                    {this.renderSortIcon(column.title)}
                </span>
            </th>
        );
        header.push(<th key={'th-filler'} className='filler'/>);
        return header;
    };

    render(): React.ReactNode {
        return <thead>
            <tr>
                {this.renderHeader()}
            </tr>
        </thead>;
    }
}
