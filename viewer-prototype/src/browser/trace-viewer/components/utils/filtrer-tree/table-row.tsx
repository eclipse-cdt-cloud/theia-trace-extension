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
    getCheckedStatus: (id: number) => number;
    onToggleCollapse: (id: number) => void;
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

    renderToggleCollapse = (): React.ReactNode => {
        const marginLeft = this.props.level * 15 + 'px';
        return (
            (this.props.node.children.length === 0)
                ? <span style={{marginLeft:marginLeft, paddingLeft: 20}}></span>
                : <span style={{marginLeft:marginLeft, paddingRight: 5}} onClick={this.handleCollapse}>
                    {(this.isCollapsed() ? icons.expand : icons.collapse)}
                </span>
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
                : <span style={{marginLeft: 5}}></span>;
    };

    renderRow = (): React.ReactNode => this.props.node.labels.map((_label: string, index) => {
        let toggleCollapse: React.ReactNode;
        let toggleCheck: React.ReactNode;
        if (index === 0) {
            toggleCollapse = this.renderToggleCollapse();
            toggleCheck = this.renderCheckbox();
        }

        return <TableCell key={this.props.node.id+'-'+index} index={index} node={this.props.node}>
            {toggleCollapse}
            {toggleCheck}
        </TableCell>;
    });

    renderChildren = (): React.ReactNode | undefined => {
        if (this.props.node.children.length && !this.isCollapsed()) {
            return this.props.node.children.map((child: TreeNode) =>
                <TableRow
                    {...this.props}
                    key={child.id}
                    node={child}
                    level={this.props.level+1}
                />
            );
        }
        return undefined;
    };

    render(): React.ReactNode | undefined {
        if (!this.props.node) {return undefined;}
        const children = this.renderChildren();

        return (
            <React.Fragment>
                <tr>{this.renderRow()}</tr>
                {children}
            </React.Fragment>
        );
    }
}
