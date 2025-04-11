import * as React from 'react';
import { TreeNode } from './tree-node';
import { TableCell } from './table-cell';
import { CheckboxComponent } from './checkbox-component';
import icons from './icons';

interface TableRowProps {
    node: TreeNode;
    level: number;
    selectedRow?: number;
    multiSelectedRows?: number[];
    collapsedNodes: number[];
    isCheckable: boolean;
    isClosable: boolean;
    getCheckedStatus: (id: number) => number;
    onToggleCollapse: (id: number) => void;
    onClose: (id: number) => void;
    onToggleCheck: (id: number) => void;
    onRowClick: (id: number) => void;
    onMultipleRowClick?: (id: number, isShiftClicked?: boolean) => void;
    onContextMenu: (event: React.MouseEvent<HTMLDivElement>, id: number) => void;
    hideFillers?: boolean;
}

export class TableRow extends React.Component<TableRowProps> {
    constructor(props: TableRowProps) {
        super(props);
    }

    isCollapsed = (): boolean => this.props.collapsedNodes.includes(this.props.node.id);

    private handleCollapse = (e: React.MouseEvent<HTMLDivElement>): void => {
        e.stopPropagation();
        this.props.onToggleCollapse(this.props.node.id);
    };

    private handleClose = (): void => {
        this.props.onClose(this.props.node.id);
    };

    renderToggleCollapse = (): React.ReactNode => {
        const width = (this.props.level + 1) * 12;
        return this.props.node.children.length === 0 ? (
            <div style={{ width, paddingRight: 5, display: 'inline-block', flexShrink: 0 }} />
        ) : (
            <div
                style={{ width, paddingRight: 5, textAlign: 'right', display: 'inline-block', flexShrink: 0 }}
                onClick={this.handleCollapse}
            >
                {this.isCollapsed() ? icons.expand : icons.collapse}
            </div>
        );
    };

    renderCheckbox = (): React.ReactNode => {
        const checkedStatus = this.props.getCheckedStatus(this.props.node.id);
        return this.props.isCheckable ? (
            <CheckboxComponent
                key={this.props.node.id}
                id={this.props.node.id}
                checkedStatus={checkedStatus}
                onToggleCheck={this.props.onToggleCheck}
            />
        ) : undefined;
    };

    renderCloseButton = (): React.ReactNode =>
        this.props.isClosable && this.props.node.id ? (
            <div style={{ paddingRight: 5, display: 'inline' }} onClick={this.handleClose}>
                {icons.close}
            </div>
        ) : undefined;

    renderRow = (): React.ReactNode => {
        const { node } = this.props;
        const row = node.labels.map((_label: string, index) => (
            <TableCell key={node.id + '-' + index} index={index} node={node}>
                {index === 0 ? this.renderToggleCollapse() : undefined}
                {index === 0 ? this.renderCheckbox() : undefined}
                {index === 0 ? this.renderCloseButton() : undefined}
            </TableCell>
        ));
        if (!this.props.hideFillers) {
            row.push(<td key={node.id + '-filler'} className="filler" />);
        }
        return row;
    };

    renderChildren = (): React.ReactNode | undefined => {
        if (this.props.node.children.length && !this.isCollapsed()) {
            return this.props.node.children.map((child: TreeNode) => (
                <TableRow {...this.props} key={child.id} node={child} level={this.props.level + 1} />
            ));
        }
        return undefined;
    };

    onClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        const { node, onRowClick, onMultipleRowClick } = this.props;

        if (onMultipleRowClick && e.ctrlKey) {
            onMultipleRowClick(node.id, false);
        } else if (onMultipleRowClick && e.shiftKey) {
            onMultipleRowClick(node.id, true);
        } else {
            onRowClick(node.id);
        }
    };

    onContextMenu = (event: React.MouseEvent<HTMLDivElement>): void => {
        const { node, onContextMenu } = this.props;
        if (onContextMenu) {
            onContextMenu(event, node.id);
        }
    };

    render(): React.ReactNode | undefined {
        if (!this.props.node) {
            return undefined;
        }
        const children = this.renderChildren();
        const { node, selectedRow, multiSelectedRows } = this.props;
        let className = '';

        if (selectedRow === node.id || multiSelectedRows?.includes(node.id)) {
            className = 'selected';
        }

        {
            return (
                <React.Fragment>
                    <tr className={className} onClick={this.onClick} onContextMenu={this.onContextMenu}>
                        {this.renderRow()}
                    </tr>
                    {children}
                </React.Fragment>
            );
        }
    }
}
