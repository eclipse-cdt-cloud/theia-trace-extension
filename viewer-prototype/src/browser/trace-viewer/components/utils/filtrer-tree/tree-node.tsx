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
    collapsed: boolean;
    children: JSX.Element | undefined;
    onToggleCollapse: (id: number) => void;
    onToggleCheck: (id: number) => void;
}

export class TreeNodeComponent extends React.Component<TreeNodeComponentProps> {
    constructor(props: TreeNodeComponentProps) {
        super(props);
    }

    private isLeaf = (): boolean => this.props.node.children.length === 0;

    private handleCollapse = (): void => {
        this.props.onToggleCollapse(this.props.node.id);
    };

    renderChildren = (): JSX.Element | undefined => {
        if (this.props.collapsed) {
            return undefined;
        }
        return this.props.children;
    };

    render(): JSX.Element {
        return (
            <li style={{paddingLeft:this.props.padding}}>
                <div
                    data-level={this.props.level}
                    key={this.props.node.id}
                    style={{display: 'flex', flexDirection: 'row', position: 'relative', transform: 'translateY(+20%)', top:'50%',
                    paddingRight: '8px', paddingLeft: '8px', height: 20, whiteSpace: 'nowrap'}}
                >
                    { this.isLeaf()
                        ? <span style={{paddingLeft:this.props.padding}}></span>
                        : <span
                            onClick={this.handleCollapse}
                            key={'icon-' + this.props.node.id}
                            style={{width: 12}}
                        >
                            {(this.props.collapsed ? icons.expand : icons.collapse)}
                        </span>
                    }

                    { this.props.isCheckable
                        ? <CheckboxComponent key={this.props.node.id}
                            id={this.props.node.id}
                            name={this.props.node.name}
                            checkedStatus={this.props.checkedStatus}
                            onToggleCheck={this.props.onToggleCheck}
                        />
                        : <span style={{marginLeft: 5}}>{this.props.node.name}</span>
                    }
                </div>
                {this.renderChildren()}
            </li>
        );
    }
}
