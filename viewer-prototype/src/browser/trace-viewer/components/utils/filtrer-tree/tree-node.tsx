import * as React from 'react';
import { CheckboxComponent } from './checkbox-component';
import icons from './icons';

export interface TreeNode {
    id: number;
    parentId: number;
    name: string;
    children: Array<TreeNode>;
    isRoot: boolean;
}

export const defaultTreeNode: TreeNode = {
    id: -1,
    parentId: -1,
    name: '',
    children: [],
    isRoot: false
};

interface TreeNodeComponentProps {
    node: TreeNode;
    checkedStatus: number;
    level: number;
    padding: number;
    isCheckable: boolean;
    collapseEnabled: boolean;
    collapsed: boolean;
    children: JSX.Element | undefined;
    onCollapsed: (id: number) => void;
    onChecked: (id: number) => void;
}

export class TreeNodeComponent extends React.Component<TreeNodeComponentProps> {
    constructor(props: TreeNodeComponentProps) {
        super(props);
    }

    private isLeaf = (): boolean => this.props.node.children.length === 0;

    renderChildren = (): JSX.Element | undefined => {
        if (this.props.collapsed) {
            return undefined;
        }
        return this.props.children;
    };

    renderCollapseIcon = (): JSX.Element | undefined => {
        if (this.props.collapseEnabled) {
            return (
                this.isLeaf()
                ? undefined
                : <span
                    onClick={() => this.props.onCollapsed(this.props.node.id)}
                    key={'icon-' + this.props.node.id}
                    style={{width: 12}}
                >
                    {(this.props.collapsed ? icons.expand : icons.collapse)}
                </span>
            );
        }
        return undefined;
    };

    render(): JSX.Element {
        return (
            <li style={{paddingLeft:this.props.padding}}>
                <div
                    data-level={this.props.level}
                    key={this.props.node.id}
                    style={{display: 'flex', flexDirection: 'row', minHeight: 20}}
                >
                    { this.renderCollapseIcon()}

                    { this.props.isCheckable
                        ? <CheckboxComponent key={this.props.node.id}
                            id={this.props.node.id}
                            name={this.props.node.name}
                            checkedStatus={this.props.checkedStatus}
                            onChecked={this.props.onChecked}
                        />
                        : <span style={{marginLeft: 5, whiteSpace: 'nowrap'}}>{this.props.node.name}</span>
                    }
                </div>
                {this.renderChildren()}
            </li>
        );
    }
}
