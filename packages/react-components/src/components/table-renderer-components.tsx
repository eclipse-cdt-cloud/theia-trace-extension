import { faAngleDown, faSearch, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICellRendererParams, IFloatingFilterParams } from 'ag-grid-community';
import debounce from 'lodash.debounce';
import * as React from 'react';

type CellRendererProps = ICellRendererParams & {
    filterModel: Map<string, string>;
    searchResultsColor: string;
};

type SearchFilterRendererProps = IFloatingFilterParams & {
    onFilterChange: (colName: string, filterValue: string) => void;
    onclickNext: () => void;
    colName: string;
};

interface SearchFilterRendererState {
    hasHovered: boolean;
    hasClicked: boolean;
}

export class LoadingRenderer extends React.Component<ICellRendererParams> {
    render(): JSX.Element {
        return <React.Fragment>
            {this.props.value ? this.props.value : <FontAwesomeIcon icon={faSpinner} />}
        </React.Fragment>;
    }
}

export class CellRenderer extends React.Component<CellRendererProps> {
    render(): JSX.Element {
        if (this.props.value === undefined) {
            return <React.Fragment><FontAwesomeIcon icon={faSpinner} /></React.Fragment>;
        }
        const currField = this.props.colDef?.field;
        const currFieldVal = this.props.value || '';
        const isMatched = this.props.data && this.props.data['isMatched'];
        let cellElement: JSX.Element;
        const searchTerm = (currField && this.props.filterModel.get(currField)) || '';
        if (this.props.filterModel.size > 0) {
            if (isMatched) {
                cellElement = <>
                    {currFieldVal.split(searchTerm).map((tag: string, index: number, array: string[]) =>
                        <span key={index.toString()}>
                            <>
                                {tag}
                            </>
                            <>
                                {
                                    index < array.length - 1 ?
                                        <span style={{ backgroundColor: this.props.searchResultsColor }}>{searchTerm}</span>
                                        : <></>
                                }
                            </>
                        </span>
                    )}
                </>;
            }
            else {
                cellElement = <span style={{ color: '#808080' }}> {currFieldVal} </span>;
            }
        } else {
            cellElement = <>{currFieldVal || ''}</>;
        }

        return <React.Fragment>
            {cellElement}
        </React.Fragment>;
    }
}

export class SearchFilterRenderer extends React.Component<SearchFilterRendererProps, SearchFilterRendererState> {

    private debouncedChangeHandler: (colName: string, inputVal: string) => void;

    constructor(props: SearchFilterRendererProps) {
        super(props);
        this.state = {
            hasHovered: false,
            hasClicked: false
        };

        this.debouncedChangeHandler = debounce((colName, inputVal) => {
            this.props.onFilterChange(colName, inputVal);
        }, 500);

        this.onInputBoxChanged = this.onInputBoxChanged.bind(this);
        this.onMouseEnterHandler = this.onMouseEnterHandler.bind(this);
        this.onMouseLeaveHandler = this.onMouseLeaveHandler.bind(this);
        this.onClickHandler = this.onClickHandler.bind(this);
        this.onDownClickHandler = this.onDownClickHandler.bind(this);
        this.onCloseClickHandler = this.onCloseClickHandler.bind(this);
        this.onKeyDownEvent = this.onKeyDownEvent.bind(this);

    }

    render(): JSX.Element {
        return (
            <div onMouseEnter={this.onMouseEnterHandler} onMouseLeave={this.onMouseLeaveHandler} onClick={this.onClickHandler}>
                {!this.state.hasClicked && !this.state.hasHovered &&
                    <FontAwesomeIcon style={{ marginLeft: '10px' }} icon={faSearch} />}
                {!this.state.hasClicked && this.state.hasHovered &&
                    <div style={{ cursor: 'pointer' }}>
                        <FontAwesomeIcon style={{ marginLeft: '10px' }} icon={faSearch} />
                        <span style={{ marginLeft: '10px', fontSize: '13px', width: '50px', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search</span>
                    </div>}
                {this.state.hasClicked &&
                    <div>
                        <input type="text" autoFocus={true} onKeyDown={this.onKeyDownEvent} onInput={this.onInputBoxChanged} style={{ width: '50%', margin: '10px' }} />
                        <FontAwesomeIcon className='hoverClass' icon={faTimes} style={{ marginTop: '20px' }} onClick={this.onCloseClickHandler} />
                        <FontAwesomeIcon className='hoverClass' icon={faAngleDown} style={{ marginLeft: '10px', marginTop: '20px' }} onClick={this.onDownClickHandler} />
                    </div>}
            </div>
        );
    }

    private onKeyDownEvent(event: React.KeyboardEvent) {
        if (event.key === 'Enter') {
            this.props.onclickNext();
        } else if (event.key === 'Escape') {
            this.setState({
                hasClicked: false
            });
            this.props.onFilterChange(this.props.colName, '');
        }
        return;
    }

    private onInputBoxChanged(event: React.ChangeEvent<HTMLInputElement>) {
        this.debouncedChangeHandler(this.props.colName, event.target.value);
        return;
    }

    private onMouseEnterHandler() {
        this.setState({
            hasHovered: true
        });
        return;
    }

    private onMouseLeaveHandler() {
        this.setState({
            hasHovered: false
        });
        return;
    }

    private onClickHandler() {
        this.setState({
            hasClicked: true
        });
        return;
    }

    private onDownClickHandler() {
        this.props.onclickNext();
        return;
    }

    private onCloseClickHandler(event: React.MouseEvent) {
        this.setState({
            hasClicked: false
        });
        this.props.onFilterChange(this.props.colName, '');
        event.stopPropagation();
        return;
    }
}
