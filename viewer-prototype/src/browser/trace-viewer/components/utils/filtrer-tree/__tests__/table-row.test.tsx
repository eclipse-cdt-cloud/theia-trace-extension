import * as React from 'react';
import { TreeNode } from '../tree-node';
import { TableRow } from '../table-row';
import { create } from 'react-test-renderer';
import { render, fireEvent } from "@testing-library/react";
import { within } from "@testing-library/dom";

const mockOnChecked = jest.fn();
const mockOnCollapse = jest.fn();

const cell1Text = "cell1 - text";
const testTreeNode = {
    id: 5,
    parentId: -1,
    labels: [cell1Text],
    children: [],
    isRoot: true
} as TreeNode;

test('Checked status', () => {
    const treeNodeUnchecked = create(<TableRow
        node={testTreeNode}
        getCheckedStatus={id => 0}
        level={0}
        isCheckable={true}
        collapsedNodes={[]}
        onToggleCollapse={mockOnCollapse}
        onToggleCheck={mockOnChecked}
    />)
        .toJSON();
    expect(treeNodeUnchecked).toMatchSnapshot();

    const treeNodeChecked = create(<TableRow
        node={testTreeNode}
        getCheckedStatus={id => 1}
        level={0}
        isCheckable={true}
        collapsedNodes={[]}
        onToggleCollapse={mockOnCollapse}
        onToggleCheck={mockOnChecked}
    />)
        .toJSON();
    expect(treeNodeChecked).toMatchSnapshot();

    const treeNodePartialCheck = create(<TableRow
        node={testTreeNode}
        getCheckedStatus={id => 2}
        level={0}
        isCheckable={true}
        collapsedNodes={[]}
        onToggleCollapse={mockOnCollapse}
        onToggleCheck={mockOnChecked}
    />)
        .toJSON();
    expect(treeNodePartialCheck).toMatchSnapshot();
});

test('Uncheckable', () => {
    const uncheckableTree = create(<TableRow
        node={testTreeNode}
        level={0}
        isCheckable={false}
        getCheckedStatus={id => 0}
        collapsedNodes={[]}
        onToggleCollapse={mockOnCollapse}
        onToggleCheck={mockOnChecked}
    />)
        .toJSON();
    expect(uncheckableTree).toMatchSnapshot();

});

test('Levels', () => {
    const lessPadding = create(<TableRow
        node={testTreeNode}
        getCheckedStatus={id => 0}
        level={1}
        isCheckable={true}
        collapsedNodes={[]}
        onToggleCollapse={mockOnCollapse}
        onToggleCheck={mockOnChecked}
    />)
        .toJSON();
    expect(lessPadding).toMatchSnapshot();

    const morePadding = create(<TableRow
        node={testTreeNode}
        getCheckedStatus={id => 0}
        level={10}
        isCheckable={true}
        collapsedNodes={[]}
        onToggleCollapse={mockOnCollapse}
        onToggleCheck={mockOnChecked}
    />)
        .toJSON();
    expect(morePadding).toMatchSnapshot();

});

test('Toggle check', async () => {
    mockOnChecked.mockClear();
    let { getByText } = render(<TableRow
        node={testTreeNode}
        getCheckedStatus={id => 0}
        level={0}
        isCheckable={true}
        collapsedNodes={[]}
        onToggleCollapse={mockOnCollapse}
        onToggleCheck={mockOnChecked}
    />)
    const element = getByText(cell1Text);
    let {getByRole} = within(element);
    const image = getByRole("img",  {hidden: true});
    fireEvent.click(image as HTMLElement);
    expect(mockOnChecked).toHaveBeenCalledTimes(1);
    expect(mockOnChecked).toHaveBeenCalledWith(testTreeNode.id);

    fireEvent.click(image as HTMLElement);
    expect(mockOnChecked).toHaveBeenCalledTimes(2);
    expect(mockOnChecked).toHaveBeenCalledWith(testTreeNode.id);
});

describe('with children', () => {
    
    const parentText = "parent text";
    const child1 = {
        id: 2,
        parentId: 1,
        labels: ['child 1 text'],
        children: [],
        isRoot: false
    } as TreeNode;
    const child2 = {
        id: 3,
        parentId: 1,
        labels: ['child 2 text'],
        children: [],
        isRoot: false
    } as TreeNode;
    const parentNode = {
        id: 1,
        parentId: -1,
        labels: [parentText],
        children: [child1, child2],
        isRoot: true
    } as TreeNode;
    
    test('With children', () => {
        
        let nodeWithChildren = create(<TableRow
            node={parentNode}
            getCheckedStatus={id => 0}
            level={0}
            isCheckable={true}
            collapsedNodes={[]}
            onToggleCollapse={mockOnCollapse}
            onToggleCheck={mockOnChecked}
        />)
            .toJSON();
        expect(nodeWithChildren).toMatchSnapshot();
    })

    test('With children collapsed', () => {
        
        let nodeWithChildren = create(<TableRow
            node={parentNode}
            getCheckedStatus={id => 0}
            level={0}
            isCheckable={true}
            collapsedNodes={[parentNode.id]}
            onToggleCollapse={mockOnCollapse}
            onToggleCheck={mockOnChecked}
        />)
            .toJSON();
        expect(nodeWithChildren).toMatchSnapshot();
    })

    test('Toggle collapse', () => {
        mockOnCollapse.mockClear();
       
        let { getByText } = render(<TableRow
            node={parentNode}
            getCheckedStatus={id => 0}
            level={0}
            isCheckable={true}
            collapsedNodes={[]}
            onToggleCollapse={mockOnCollapse}
            onToggleCheck={mockOnChecked}
        />)
        const element = getByText(parentText);
        const collapsedEl = within(element).getAllByRole("img", {hidden: true})[0];
        fireEvent.click(collapsedEl as HTMLElement);
        expect(mockOnCollapse).toHaveBeenCalledTimes(1)
        expect(mockOnCollapse).toHaveBeenCalledWith(parentNode.id)  
    });

});

describe('Multiple labels', () => {
    
    const parentText = "parent 1 text";
    const parentText2 = "parent 2 text";
    const child1 = {
        id: 2,
        parentId: 1,
        labels: ['child1', 'child 1 text'],
        children: [],
        isRoot: false
    } as TreeNode;
    const child2 = {
        id: 3,
        parentId: 1,
        labels: ['child2', 'child 2 text'],
        children: [],
        isRoot: false
    } as TreeNode;
    const parentNode = {
        id: 1,
        parentId: -1,
        labels: [parentText, parentText2],
        children: [child1, child2],
        isRoot: true
    } as TreeNode;
    
    test('With children and labels', () => {
        
        let nodeWithChildren = create(<TableRow
            node={parentNode}
            getCheckedStatus={id => 0}
            level={0}
            isCheckable={true}
            collapsedNodes={[]}
            onToggleCollapse={mockOnCollapse}
            onToggleCheck={mockOnChecked}
        />)
            .toJSON();
        expect(nodeWithChildren).toMatchSnapshot();
    })

});



