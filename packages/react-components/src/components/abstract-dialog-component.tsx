import React from 'react';
import ReactModal from 'react-modal';
import '../../style/dialog-component-style.css';
import '../../style/output-components-style.css';

export interface DialogComponentProps {
    title: string,
    onCloseDialog: () => void,
    isOpen: boolean
}

export abstract class AbstractDialogComponent<P extends DialogComponentProps, S> extends React.Component<P, S> {
    constructor(props: P) {
        super(props);
    }

    render(): React.ReactNode {
        return <ReactModal isOpen={this.props.isOpen}
        overlayClassName="dialog-overlay"
        className="dialog"
        ariaHideApp={false}
        shouldFocusAfterRender={false}>
            <div onClick={e => {e.preventDefault();}}>
                <div className='dialog-header'>
                    <div>{this.props.title}</div>
                    <i className='dialog-header-close codicon codicon-close' onClick={this.props.onCloseDialog}></i>
                </div>
                <div className='dialog-body'>{this.renderDialogBody()}</div>
                <div className='dialog-footer'>{this.renderFooter()}</div>
            </div>
        </ReactModal>;
    }

    protected abstract renderDialogBody(): React.ReactElement;
    protected abstract renderFooter(): React.ReactElement;
}
