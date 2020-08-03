import * as React from 'react';
import { TreeNode } from './tree-node';

interface TableProps {
    nodes: TreeNode[];
}

export class Table extends React.Component<TableProps> {
    private keys: string[] = [];
    private flatTree: TreeNode[] = [];

    constructor(props: TableProps) {
        super(props);
        this.flatTree = this.flattenTree(this.props.nodes);
    }

    flattenTree = (nodes: TreeNode[]): TreeNode[] => {
        let flatTree: TreeNode[] = [];
        nodes.forEach((node: TreeNode) => {
            flatTree.push(node);
            if (node.children.length) {
                flatTree = flatTree.concat(...this.flattenTree(node.children));
            }
        });
        return flatTree;
    };

    renderTableHeader(): React.ReactNode {
        const keys = Object.keys(this.props.nodes[0]);
        const excludeKeys = ['isRoot', 'children', 'style', 'metadata', 'labels', 'id', 'parentId'];
        const header = keys.filter(key => !excludeKeys.includes(key)).concat('Legend');
        this.keys = header;
        return header.map((title, index) => <th key={index}>{this.toCapitalCase(title)}</th>);
    }

    toCapitalCase = (name: string): string => (name.charAt(0).toUpperCase() + name.slice(1));

    renderRow(node: TreeNode): React.ReactNode {
        return this.keys.map((key: string, index) => {
            if (key === 'Legend') {
                return <td key={node.id+'-'+index}></td>;
            } else {
                return <td key={node.id+'-'+index}>{node[key as keyof TreeNode]}</td>;
            }
        });
    }

    renderTableData(): React.ReactNode {
        return this.flatTree.map((node: TreeNode) => (
                <tr key={node.id}>
                    {this.renderRow(node)}
                </tr>
            ));
    }

    render(): JSX.Element {
        return (
            <div>
                <table style={{borderCollapse: 'collapse'}} className="table-tree">
                    <tbody>
                        <tr>{this.renderTableHeader()}</tr>
                        {this.renderTableData()}
                    </tbody>
                </table>
            </div>
        );
    }

}
