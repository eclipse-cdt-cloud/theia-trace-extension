import * as React from 'react';
import { GridApi } from 'ag-grid-community';
import { numberFormat } from './xy-output-component-utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

interface PaginationBarProps {
    paginationPageSize: number;
    paginationTotalPages: number;
    nbEvents: number;
    gridApi: GridApi | undefined;
}

enum Direction {
    NEXT,
    PREVIOUS,
    FIRST,
    LAST
}

export class PaginationBarComponent extends React.Component<PaginationBarProps> {
    render(): JSX.Element {
        const currentPage = this.props.gridApi?.paginationGetCurrentPage() ? this.props.gridApi?.paginationGetCurrentPage() + 1 : 1;
        const firstRowRaw = (currentPage - 1) * this.props.paginationPageSize + 1;
        const firstRow = numberFormat(firstRowRaw);
        const lastRow = currentPage === this.props.paginationTotalPages + 1 ?
            numberFormat(this.props.nbEvents) :
            numberFormat(firstRowRaw + this.props.paginationPageSize - 1);

        return <div className='pagination-bar'>
            <span style={{ margin: 'auto 10px auto auto'}}>
                {firstRow} to {lastRow} of {numberFormat(this.props.nbEvents)}
            </span>

            <button className='pagination-button' onClick={() => this.paginationJumpTo(Direction.FIRST)}>
                <FontAwesomeIcon icon={faChevronLeft} />
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <button className='pagination-button' onClick={() => this.paginationJumpTo(Direction.PREVIOUS)}>
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <span style={{ margin: 'auto 10px' }}>
                Page {currentPage} of {this.props.paginationTotalPages + 1}
            </span>

            <button className='pagination-button' onClick={() => this.paginationJumpTo(Direction.NEXT)}>
                <FontAwesomeIcon icon={faChevronRight} />
            </button>

            <button className='pagination-button' style={{ marginRight: '10px' }} onClick={() => this.paginationJumpTo(Direction.LAST)}>
                <FontAwesomeIcon icon={faChevronRight} />
                <FontAwesomeIcon icon={faChevronRight} />
            </button>
        </div>;
    }

    private paginationJumpTo(direction: Direction): void {
        switch (direction) {
            case Direction.FIRST:
                this.props.gridApi?.paginationGoToFirstPage();
                break;
            case Direction.LAST:
                this.props.gridApi?.paginationGoToLastPage();
                break;
            case Direction.NEXT:
                this.props.gridApi?.paginationGoToNextPage();
                break;
            case Direction.PREVIOUS:
                this.props.gridApi?.paginationGoToPreviousPage();
                break;
        }

        this.forceUpdate();
    }
}
