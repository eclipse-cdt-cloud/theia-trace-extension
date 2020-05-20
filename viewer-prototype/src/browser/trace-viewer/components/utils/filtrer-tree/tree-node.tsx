import * as React from 'react';
import { CheckboxComponent } from './checkbox-component';
import { Indent } from './indent';
import icons from './icons';

export type TreeNode = {
    id: number;
    parentId: number;
    name: string;
    expanded: boolean;
    children: [];
    isRoot: boolean;
}

export const defaultTreeNode: TreeNode = {
    id: -1,
    parentId: -1,
    name: '',
    expanded: true,
    children: [],
    isRoot: false
}

type TreeNodeComponentProps = {
    node: TreeNode;
    checkedStatus: number;
    level: number;
    isCheckable: boolean;
    children: JSX.Element | null;
    onExpanded: (id: number) => void;
    onChecked: (id: number) => void;
} 

export class TreeNodeComponent extends React.Component<TreeNodeComponentProps> {
    constructor(props: TreeNodeComponentProps) {
        super(props);
    }

    private isLeaf = (): boolean => {
        return this.props.node.children.length === 0;
    }

    renderChildren = (): JSX.Element | null => {
        if (!this.props.node.expanded) {
            return null;
        }
        return this.props.children;
    }

    render() {
        return (
            <React.Fragment>
                <div 
                    data-level={this.props.level} 
                    key={this.props.node.id} 
                    style={{display: 'flex', flexDirection: 'row', padding: '5px 8px'}}
                >
                    <Indent level={this.props.level} isLastLevel={this.isLeaf()}></Indent>

                    { !this.isLeaf() 
                        &&
                        <span 
                            onClick={() => this.props.onExpanded(this.props.node.id)} 
                            key={'icon-' + this.props.node.id}
                            style={{width: 12}}
                        >
                            {(this.props.node.expanded ? icons.collapse : icons.expand)}
                        </span>
                    }
                    
                    { this.props.isCheckable 
                        ? <CheckboxComponent key={this.props.node.id}
                            id={this.props.node.id}
                            name={this.props.node.name}
                            checkedStatus={this.props.checkedStatus}
                            onChecked={this.props.onChecked}
                        />
                        : <span style={{marginLeft: 5}}>{this.props.node.name}</span> 
                    } 
                </div>
                {this.renderChildren()}
            </React.Fragment>
        )
    }
}