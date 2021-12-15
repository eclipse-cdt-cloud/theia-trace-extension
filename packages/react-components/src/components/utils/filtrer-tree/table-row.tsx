import * as React from 'react';
import { TreeNode } from './tree-node';
import { TableCell } from './table-cell';
import { CheckboxComponent } from './checkbox-component';
import icons from './icons';

interface TableRowProps {
    node: TreeNode;
    level: number;
    collapsedNodes: number[];
    isCheckable: boolean;
    isClosable: boolean;
    getCheckedStatus: (id: number) => number;
    onToggleCollapse: (id: number) => void;
    onClose: (id: number) => void;
    onToggleCheck: (id: number) => void;
}

export class TableRow extends React.Component<TableRowProps> {
    constructor(props: TableRowProps) {
        super(props);
    }

    isCollapsed = (): boolean => this.props.collapsedNodes.includes(this.props.node.id);

    private handleCollapse = (): void => {
        this.props.onToggleCollapse(this.props.node.id);
    };

    private handleClose = (): void => {
        this.props.onClose(this.props.node.id);
    };

    renderToggleCollapse = (): React.ReactNode => {
        const width = (this.props.level + 1) * 12;
        return (
            (this.props.node.children.length === 0)
                ? <div style={{ width, paddingRight: 5, display: 'inline-block' }} />
                : <div style={{ width, paddingRight: 5, textAlign: 'right', display: 'inline-block' }} onClick={this.handleCollapse}>
                    {(this.isCollapsed() ? icons.expand : icons.collapse)}</div>
        );
    };

    renderCheckbox = (): React.ReactNode => {
        const checkedStatus = this.props.getCheckedStatus(this.props.node.id);
        return this.props.isCheckable
            ? <CheckboxComponent
                key={this.props.node.id}
                id={this.props.node.id}
                checkedStatus={checkedStatus}
                onToggleCheck={this.props.onToggleCheck}
            />
            : undefined;
    };

    renderCloseButton = (): React.ReactNode =>
        (this.props.isClosable && this.props.node.id)
            ? <div style={{ paddingRight: 5, display: 'inline' }} onClick={this.handleClose}>{icons.close}</div>
            : undefined;

    renderRow = (): React.ReactNode => {
        const row = this.props.node.labels.map((_label: string, index) =>
            <TableCell key={this.props.node.id + '-' + index} index={index} node={this.props.node}>
                { (index === 0) ? this.renderToggleCollapse() : undefined }
                { (index === 0) ? this.renderCheckbox() : undefined }
                { (index === 0) ? this.renderCloseButton() : undefined }
            </TableCell>
        );
        row.push(<td key={this.props.node.id + '-filler'} className='filler'/>);
        return row;
    };

    renderChildren = (): React.ReactNode | undefined => {
        if (this.props.node.children.length && !this.isCollapsed()) {
            return this.props.node.children.map((child: TreeNode) =>
                <TableRow
                    {...this.props}
                    key={child.id}
                    node={child}
                    level={this.props.level + 1}
                />
            );
        }
        return undefined;
    };

    render(): React.ReactNode | undefined {
        if (!this.props.node) { return undefined; }
        const children = this.renderChildren();

        return (
            <React.Fragment>
                <tr>{this.renderRow()}</tr>
                {children}
            </React.Fragment>
        );
    }
}
