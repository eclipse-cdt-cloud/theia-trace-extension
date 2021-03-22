import icons from './icons';
import { TreeNode } from './tree-node';

interface SortState {
    asc: React.ReactNode,
    desc: React.ReactNode,
    default: React.ReactNode;
}

export const sortState: SortState = {
    asc: icons.sortUp,
    desc: icons.sortDown,
    default: icons.sort
};

export interface SortConfig {
    column: string;
    columnIndex: number;
    sortState: React.ReactNode;
}

export const nextSortState = (currentState: React.ReactNode): React.ReactNode => {
    if (currentState === sortState.default || currentState === sortState.desc) {
        return sortState.asc;
    } else if (currentState === sortState.asc) {
        return sortState.desc;
    } else {
        return sortState.default;
    }
};

export const sortNodes = (nodes: TreeNode[], sortConfig: SortConfig[]): TreeNode[] => {
    const sortedNodes = [...nodes];
    const orderToSort = sortConfig.find((config: SortConfig) => config.sortState !== sortState.default);
    if (orderToSort) {
        sortedNodes.sort((node1: TreeNode, node2: TreeNode) => {
            const index = orderToSort.columnIndex;
            const value1: string = node1.labels[index];
            const value2: string = node2.labels[index];
            let comp = 0;
            if (!value1 && value2) {
                comp = -1;
            } else if (value1 && !value2) {
                comp = 1;
            } else if (!value1 && !value2) {
                comp = 0;
            } else {
                const number1 = parseValue(value1);
                const number2 = parseValue(value2);
                if (number1 !== undefined && number2 !== undefined) {
                    if (number1 < number2) {
                        comp = -1;
                    } else if (number1 > number2) {
                        comp = 1;
                    } else {
                        comp = 0;
                    }
                } else {
                    comp = value1.localeCompare(value2);
                }
            }
            return (orderToSort.sortState === sortState.asc) ? comp : -comp;
        });
        sortedNodes.forEach((node: TreeNode) => {
            if (node.children.length) {
                node.children = sortNodes(node.children, sortConfig);
            }
        });
    }
    return sortedNodes;
};

const parseValue = (valueString: string): number | undefined => {
    let floatNumber = NaN;
    let factor = -1;
    const valueArray = valueString.split(' ');
    if (valueArray.length === 1) {
        floatNumber = Number.parseFloat(valueString);
        factor = 1;
    } else if (valueArray.length === 2) {
        const value = valueArray[0];
        const unit = valueArray[1];
        if (unit === 'ns' || unit === '%') {
            factor = 1;
        } else if (unit === 'us' || unit === ('\u00B5' + 's')) {
            factor = 1000;
        } else if (unit === 'ms') {
            factor = 1000 * 1000;
        } else if (unit === 's') {
            factor = 1000 * 1000 * 1000;
        } else {
            return undefined;
        }
        floatNumber = Number.parseFloat(value);
    }
    if (!Number.isNaN(floatNumber)) {
        return floatNumber * factor;
    }
    return undefined;
};

