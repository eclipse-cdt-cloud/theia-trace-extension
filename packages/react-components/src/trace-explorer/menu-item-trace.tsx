import * as React from 'react';
import { Trace } from 'tsp-typescript-client';
import { signalManager, Signals } from '@trace-viewer/base/lib/signals/signal-manager';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';

interface MenuItemProps {
    index: number;
    experimentName: string;
    experimentUUID: string;
    traces: Trace[];
    onExperimentNameChange: (newExperimentName: string, index: number) => void;
    menuItemTraceContainerClassName: string;
    handleClickEvent: (event: React.MouseEvent<HTMLDivElement>, experimentName: string) => void;
    handleContextMenuEvent: (event: React.MouseEvent<HTMLDivElement>, experimentUUID: string) => void;
}
interface MenuItemState {
    editingTab: boolean;
    oldExperimentName: string;
    experimentNameState: string;
}

export class MenuItemTrace extends React.Component<MenuItemProps, MenuItemState> {

    private wrapper: React.RefObject<HTMLDivElement>;

    constructor(menuItemProps: MenuItemProps) {
        super(menuItemProps);
        this.state = {
            oldExperimentName: this.props.experimentName,
            experimentNameState: this.props.experimentName,
            editingTab: false
        };
        this.wrapper = React.createRef();
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    submitNewExperimentName(): void {
        if (this.state.experimentNameState.length > 0) {
            this.setState({
                editingTab: false,
                oldExperimentName: this.state.experimentNameState
            });
            this.props.onExperimentNameChange(this.state.experimentNameState, this.props.index);
        } else {
            this.setState({
                editingTab: false,
                experimentNameState: this.state.oldExperimentName
            });
            const tabName = 'Trace: ' + this.state.oldExperimentName;
            signalManager().fireExperimentChangedSignal(tabName, this.props.experimentUUID);
        }
        document.removeEventListener('click', this.handleClickOutside);
    }

    handleClickOutside = (event: Event): void => {
        const node = this.wrapper.current;
        if ((!node || !node.contains(event.target as Node)) && this.state.editingTab === true) {
            this.submitNewExperimentName();
        }
    };

    protected handleEnterPress(event: React.KeyboardEvent<HTMLInputElement>): void{
        if (event.key === 'Enter' && this.state.editingTab === true){
            this.submitNewExperimentName();
        }
    }

    protected changeText(event: React.ChangeEvent<HTMLInputElement>): void{
        let newName = event.target.value.toString();
        this.setState({
            experimentNameState : newName
        });
        newName = 'Trace: ' + newName;
        signalManager().fireExperimentChangedSignal(newName,  this.props.experimentUUID);
    }
    protected inputTab(): React.ReactNode {
        if (!this.state.editingTab) {
            return (
            <div className='wrapper'>
                {this.state.experimentNameState}
                <div className='edit-trace-name' onClick={e => {this.renderEditTraceName(e);}}>
                    <FontAwesomeIcon icon={faPencilAlt} />
                </div>
            </div>
            );
        }
        return (<input name="tab-name" className="theia-input name-input-box"
            defaultValue = {this.state.experimentNameState}
            onChange = {e => (this.changeText(e))}
            onClick = {e => e.stopPropagation()}
            onKeyPress = {e => (this.handleEnterPress(e))}
            maxLength = {50}
        />);
    }
    protected renderEditTraceName(event: React.MouseEvent<HTMLDivElement>): void {
        document.addEventListener('click', this.handleClickOutside);
        this.setState(() => ({
            editingTab: true
        }));
        event.stopPropagation();
        event.preventDefault();
    }
    protected renderTracesForExperiment = (): React.ReactNode => this.doRenderTracesForExperiment();
    protected doRenderTracesForExperiment(): React.ReactNode {
        const tracePaths = this.props.traces;
        return (
            <div className='trace-element-path-container'>
                {tracePaths.map(trace => (
                    <div className='trace-element-path child-element' id={trace.UUID} key={trace.UUID}>
                        {` > ${trace.name}`}
                    </div>
                ))}
            </div>
        );
    }
    protected subscribeToExplorerEvents(): void {
        signalManager().on(Signals.OUTPUT_ADDED, this.changeText);
    }

    render(): JSX.Element {
        return (
            <div className={this.props.menuItemTraceContainerClassName}
            id={`${this.props.menuItemTraceContainerClassName}-${this.props.index}`}
            onClick={event => {
                    this.props.handleClickEvent(event, this.props.experimentUUID);
                }
            }
            onContextMenu={event => { this.props.handleContextMenuEvent(event, this.props.experimentUUID); }}
            data-id={`${this.props.index}`}
            ref={this.wrapper}>
            <div className='trace-element-container'>
                <div className='trace-element-info' >
                    <h4 className='trace-element-name'>
                        {this.inputTab()}
                    </h4>
                    { this.renderTracesForExperiment() }
                </div>
                {/* <div className='trace-element-options'>
                    <button className='share-context-button' onClick={this.handleShareButtonClick.bind(this, props.index)}>
                        <FontAwesomeIcon icon={faShareSquare} />
                    </button>
                </div> */}
            </div>
        </div>
        );
    }
}
